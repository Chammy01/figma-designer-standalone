package internal

import "github.com/mark3labs/mcp-go/server"

func registerWriteTools(s *server.MCPServer, node *Node) {
	registerWriteCreateTools(s, node)
	registerWriteModifyTools(s, node)
	registerWriteStyleTools(s, node)
	registerWriteVariableTools(s, node)
	registerWriteComponentTools(s, node)
	registerWritePrototypeTools(s, node)
	registerWritePageTools(s, node)
	registerWriteHTMLTools(s, node)
	// Sub-Project 2: agent toolkit overhaul (Categories A–H)
	registerEditTools(s, node)         // A — edit-not-rewrite
	registerValidationTools(s, node)   // B — validation & preview
	registerLayoutTools(s, node)       // C — layout intelligence
	registerComponentV2Tools(s, node)  // D — component ergonomics
	registerStyleEcosystemTools(s, node) // E — style ecosystem
	registerExportV2Tools(s, node)     // F — asset & export
	registerSlideTools(s, node)        // G — slide / carousel
	registerDiagnosticsTools(s, node)  // H — diagnostics
}
