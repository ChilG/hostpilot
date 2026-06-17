import { useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/AppStore";
import { useTranslation } from "@/i18n/translations";
import {
  Anchor,
  ShieldCheck,
  KeyRound,
  Globe,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
} from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function OnboardingModal({ open, onOpenChange }: Props) {
  const { setOnboardedComplete } = useAppStore();
  const { t } = useTranslation();
  const [slide, setSlide] = useState(0);
  const [copied, setCopied] = useState(false);

  const totalSlides = 4;

  const handleNext = () => {
    if (slide < totalSlides - 1) {
      setSlide(slide + 1);
    } else {
      setOnboardedComplete();
      onOpenChange(false);
    }
  };

  const handleBack = () => {
    if (slide > 0) {
      setSlide(slide - 1);
    }
  };

  const handleCopyCommand = async () => {
    try {
      await navigator.clipboard.writeText("sudo chown $(whoami) /etc/hosts");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy command:", err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-border bg-card">
        {/* Top Header Graphic */}
        <div className="h-32 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 flex items-center justify-center relative select-none">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/20">
            {slide === 0 && <Anchor className="w-9 h-9 text-white animate-pulse" strokeWidth={2.5} />}
            {slide === 1 && <ShieldCheck className="w-9 h-9 text-white" strokeWidth={2} />}
            {slide === 2 && <KeyRound className="w-9 h-9 text-white" strokeWidth={2} />}
            {slide === 3 && <Globe className="w-9 h-9 text-white animate-pulse" strokeWidth={2} />}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Slide 1: Welcome */}
          {slide === 0 && (
            <div className="space-y-3 text-center">
              <h2 className="text-xl font-bold tracking-tight">{t("welcome")}</h2>
              <p className="text-xs text-muted-foreground leading-5">
                {t("onboardingWelcomeDesc")}
              </p>
            </div>
          )}

          {/* Slide 2: Block Scope Safety */}
          {slide === 1 && (
            <div className="space-y-3 text-center">
              <h2 className="text-xl font-bold tracking-tight">
                {t("onboardingBlockSafetyTitle")}
              </h2>
              <p className="text-xs text-muted-foreground leading-5">
                {t("onboardingBlockSafetyDesc")}
              </p>
              <div className="bg-muted/50 rounded-lg p-3 text-left border border-border">
                <pre className="text-[10px] font-mono text-muted-foreground/85 leading-4 whitespace-pre-wrap">
                  {`# >>> HostPilot START: my-project\n127.0.0.1   web.local\n# <<< HostPilot END: my-project`}
                </pre>
              </div>
            </div>
          )}

          {/* Slide 3: Elevated Permissions & Script */}
          {slide === 2 && (
            <div className="space-y-3 text-center">
              <h2 className="text-xl font-bold tracking-tight">
                {t("onboardingPermissionsTitle")}
              </h2>
              <p className="text-xs text-muted-foreground leading-5">
                {t("onboardingPermissionsDesc")}
              </p>
              <div className="flex items-center gap-2 bg-muted/60 rounded-lg p-2.5 border border-border">
                <code className="text-[10px] font-mono text-indigo-400 flex-1 truncate text-left">
                  sudo chown $(whoami) /etc/hosts
                </code>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground cursor-pointer" onClick={handleCopyCommand}>
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
          )}

          {/* Slide 4: Getting Started */}
          {slide === 3 && (
            <div className="space-y-3 text-center">
              <h2 className="text-xl font-bold tracking-tight">
                {t("onboardingReadyTitle")}
              </h2>
              <p className="text-xs text-muted-foreground leading-5">
                {t("onboardingReadyDesc")}
              </p>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-2 text-foreground">
            {/* Dots */}
            <div className="flex gap-1.5">
              {Array.from({ length: totalSlides }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                    slide === i ? "bg-indigo-500 w-3" : "bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-1 cursor-pointer"
                onClick={handleBack}
                disabled={slide === 0}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                {t("back")}
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1 cursor-pointer"
                onClick={handleNext}
              >
                {slide === totalSlides - 1 ? (
                  t("getStarted")
                ) : (
                  <>
                    {t("next")}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
