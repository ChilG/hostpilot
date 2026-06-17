import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertOctagon, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in HostPilot application:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-screen bg-[#09090b] text-[#fafafa] flex flex-col items-center justify-center p-6 font-sans select-none antialiased">
          <div className="max-w-md w-full text-center space-y-6 bg-[#18181b]/50 border border-[#27272a] rounded-2xl p-8 backdrop-blur-md shadow-2xl">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 text-red-500 animate-pulse">
              <AlertOctagon className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-xl font-bold tracking-tight">Something went wrong</h1>
              <p className="text-sm text-zinc-400">
                An unexpected error occurred. We have logged the details and you can try reloading the application.
              </p>
            </div>

            {this.state.error && (
              <div className="text-left bg-zinc-950 border border-zinc-800 rounded-lg p-4 font-mono text-xs overflow-auto max-h-40 text-red-400">
                {this.state.error.toString()}
              </div>
            )}

            <Button
              onClick={this.handleReload}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl h-11 flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/10 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Application
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
