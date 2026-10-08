package internal

import (
	"context"
	"net/http"
	"testing"
	"testing/synctest"
	"time"
)

type timeoutTransport func(*http.Request) (*http.Response, error)

func (fn timeoutTransport) RoundTrip(req *http.Request) (*http.Response, error) { return fn(req) }

func TestBridgeInactivityBudgets(t *testing.T) {
	for _, c := range []struct {
		tool string
		want time.Duration
	}{{"set_reactions", 30 * time.Second}, {"get_document", 60 * time.Second}} {
		synctest.Test(t, func(t *testing.T) {
			if got := bridgeInactivityTimeout(c.tool); got != c.want {
				t.Fatalf("%s: %v", c.tool, got)
			}
			expired := false
			timer := time.AfterFunc(bridgeInactivityTimeout(c.tool), func() { expired = true })
			defer timer.Stop()
			time.Sleep(c.want - time.Nanosecond)
			synctest.Wait()
			if expired {
				t.Fatal("expired early")
			}
			time.Sleep(time.Nanosecond)
			synctest.Wait()
			if !expired {
				t.Fatal("did not expire at inactivity budget")
			}
		})
	}
}

func TestProgressExtendsInactivityButNotOverallBudgets(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		start := time.Now()
		expired := false
		entry := &pendingEntry{timer: time.AfterFunc(bridgeInactivityTimeout("set_reactions"), func() { expired = true })}
		defer entry.timer.Stop()
		time.Sleep(25 * time.Second)
		entry.extendForProgress()
		time.Sleep(59 * time.Second)
		synctest.Wait()
		if expired {
			t.Fatal("progress did not extend past original 30 seconds")
		}
		time.Sleep(time.Second)
		synctest.Wait()
		if !expired || time.Since(start) != 85*time.Second {
			t.Fatal("expected expiry 60 seconds after progress")
		}
	})
}

func TestFollowerOverallBudgetAndEarlierClientDeadline(t *testing.T) {
	for _, clientBudget := range []time.Duration{0, 10 * time.Second} {
		synctest.Test(t, func(t *testing.T) {
			follower := NewFollower("http://mock.invalid")
			if follower.client.Timeout != 35*time.Second {
				t.Fatalf("overall budget: %v", follower.client.Timeout)
			}
			follower.client.Transport = timeoutTransport(func(req *http.Request) (*http.Response, error) {
				<-req.Context().Done()
				return nil, req.Context().Err()
			})
			ctx := context.Background()
			if clientBudget > 0 {
				var cancel context.CancelFunc
				ctx, cancel = context.WithTimeout(ctx, clientBudget)
				defer cancel()
			}
			start := time.Now()
			_, err := follower.Send(ctx, "get_document", nil, nil)
			want := 35 * time.Second
			if clientBudget > 0 {
				want = clientBudget
			}
			if err == nil || time.Since(start) != want {
				t.Fatalf("elapsed=%v error=%v want=%v", time.Since(start), err, want)
			}
		})
	}
}
