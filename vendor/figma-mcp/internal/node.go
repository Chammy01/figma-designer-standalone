package internal

import (
	"context"
	"fmt"
	"log"
	"os"
	"sync"
)

var nodeLogger = log.New(os.Stderr, "[node] ", 0)

// Node dynamically routes MCP tool calls to either the Leader bridge
// or the Follower HTTP proxy, depending on the current role.
type Node struct {
	mu        sync.RWMutex
	role      Role
	ip        string
	port      int
	leader    *Leader
	follower  *Follower
	version   string
	outputDir string
}

// NewNode creates a Node in the Unknown role.
func NewNode(ip string, port int, version string) *Node {
	return &Node{
		ip:       ip,
		port:     port,
		role:     RoleUnknown,
		version:  version,
		follower: NewFollower(fmt.Sprintf("http://%s:%d", ip, port)),
	}
}

// Role returns the current role.
func (n *Node) Role() Role {
	n.mu.RLock()
	defer n.mu.RUnlock()
	return n.role
}

// RoleName returns a human-readable role string.
func (n *Node) RoleName() string {
	switch n.Role() {
	case RoleLeader:
		return "LEADER"
	case RoleFollower:
		return "FOLLOWER"
	default:
		return "UNKNOWN"
	}
}

// Send routes a request to the appropriate backend.
func (n *Node) Send(ctx context.Context, tool string, nodeIDs []string, params map[string]interface{}) (BridgeResponse, error) {
	n.mu.RLock()
	role := n.role
	leader := n.leader
	n.mu.RUnlock()

	// Normalize hyphen-format node IDs that LLMs sometimes produce.
	for i, id := range nodeIDs {
		nodeIDs[i] = NormalizeNodeID(id)
	}
	// Normalize common param keys that contain node IDs.
	for _, key := range []string{"nodeId", "parentId"} {
		if v, ok := params[key].(string); ok {
			params[key] = NormalizeNodeID(v)
		}
	}

	// Reaction replacement is destructive; validate identically before either transport.
	if tool == "set_reactions" || tool == "remove_reactions" {
		if msg := ValidateRPC(tool, nodeIDs, params); msg != "" {
			return BridgeResponse{Error: msg}, nil
		}
	}

	nodeLogger.Printf("tool=%s role=%s nodeIDs=%v", tool, n.RoleName(), nodeIDs)

	if role == RoleLeader && leader != nil {
		return leader.GetBridge().Send(ctx, tool, nodeIDs, params)
	}
	return n.follower.Send(ctx, tool, nodeIDs, params)
}

// BecomeLeader attempts to bind the port and transition to Leader role.
// Returns an error if the port is already in use.
func (n *Node) BecomeLeader() error {
	n.mu.Lock()
	defer n.mu.Unlock()

	if n.role == RoleLeader {
		return nil
	}

	leader := NewLeader(n.ip, n.port, n.version)
	if err := leader.Start(); err != nil {
		return err
	}

	n.leader = leader
	n.role = RoleLeader
	nodeLogger.Printf("became LEADER")
	return nil
}

// BecomeFollower transitions to Follower role, stopping the leader if running.
func (n *Node) BecomeFollower() {
	n.mu.Lock()
	defer n.mu.Unlock()

	if n.role == RoleFollower {
		return
	}

	if n.leader != nil {
		n.leader.Stop()
		n.leader = nil
	}

	n.role = RoleFollower
	nodeLogger.Printf("became FOLLOWER")
}

// Stop shuts down the node regardless of role.
func (n *Node) Stop() {
	n.mu.Lock()
	defer n.mu.Unlock()

	if n.leader != nil {
		n.leader.Stop()
		n.leader = nil
	}
	n.role = RoleUnknown
}

// SetOutputDir sets the base directory used for file output.
func (n *Node) SetOutputDir(dir string) {
	n.mu.Lock()
	defer n.mu.Unlock()
	n.outputDir = dir
}

// OutputDir returns the base directory for file output.
// Falls back to the process working directory if not set.
func (n *Node) OutputDir() string {
	n.mu.RLock()
	outputDir := n.outputDir
	n.mu.RUnlock()
	if outputDir != "" {
		return outputDir
	}
	dir, err := os.Getwd()
	if err != nil {
		return "."
	}
	return dir
}
