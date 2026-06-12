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
      <DialogContent className="sm:max-w-md dark p-0 overflow-hidden border-border bg-card">
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
                {t("locale") === "th"
                  ? "HostPilot คือแอปพลิเคชันเดสก์ท็อปแบบข้ามแพลตฟอร์ม ออกแบบมาเพื่อช่วยเหลือนักพัฒนาในการจัดการระบบกำหนดไอพีของโดเมนในเครื่อง (Local Domain Mappings) และจัดการพอร์ตบริการเว็บได้อย่างง่ายดาย ปลอดภัย และแสดงผลเป็นรูปธรรม"
                  : "HostPilot is a cross-platform desktop application designed to help developers manage local domain mappings and port references safely, visually, and without hassle."}
              </p>
            </div>
          )}

          {/* Slide 2: Block Scope Safety */}
          {slide === 1 && (
            <div className="space-y-3 text-center">
              <h2 className="text-xl font-bold tracking-tight">
                {t("locale") === "th" ? "การปกป้องขอบเขตบล็อกข้อมูล" : "Block-Scope Safety"}
              </h2>
              <p className="text-xs text-muted-foreground leading-5">
                {t("locale") === "th"
                  ? "HostPilot ปกป้องระบบของคุณโดยการเขียนเพิ่มหรือลดข้อมูลโฮสต์เฉพาะภายในกรอบที่คั่นด้วยสัญลักษณ์บล็อกเท่านั้น เพื่อให้มั่นใจได้ว่าข้อมูลการตั้งค่าเดิมในไฟล์ hosts ของระบบปฏิบัติการของคุณจะไม่ถูกเปลี่ยนแปลงหรือสูญหายไป"
                  : "HostPilot protects your configuration files by injecting entries exclusively inside delimited scopes. Your existing hosts file records are preserved untouched!"}
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
                {t("locale") === "th" ? "สิทธิ์การเข้าถึงระดับระบบปฏิบัติการ" : "Elevated Permissions"}
              </h2>
              <p className="text-xs text-muted-foreground leading-5">
                {t("locale") === "th"
                  ? "การบันทึกไฟล์ hosts จำเป็นต้องใช้สิทธิ์ของระบบผู้ดูแลระบบ (Admin) ในการเขียนทับ เพื่อหลีกเลี่ยงไม่ให้มีกล่องถามรหัสผ่านขึ้นมากวนใจทุกครั้งที่คุณทำการอัปเดต คุณสามารถรันคำสั่ง terminal นี้เพื่อเปลี่ยนสิทธิ์การเข้าถึงไฟล์ได้:"
                  : "Modifying the hosts file requires system admin privileges. To avoid password prompts on every save, you can make the hosts file writable by running this terminal command:"}
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
                {t("locale") === "th" ? "คุณพร้อมบินแล้ว!" : "You're Ready to Fly!"}
              </h2>
              <p className="text-xs text-muted-foreground leading-5">
                {t("locale") === "th"
                  ? "เริ่มต้นใช้งานโดยการเพิ่มรายชื่อโฮสต์หรือจับคู่พอร์ตตัวจริง และจัดกลุ่มพวกมันเข้าไว้ในโปรไฟล์ที่ต้องการ เพื่อเปิดสลับสภาพแวดล้อมต่าง ๆ ในการทดสอบโปรแกรมได้ในพริบตา"
                  : "Get started by adding your first hosts or mapping configurations, and group them into custom profiles to swap local setups instantly."}
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
                {t("locale") === "th" ? "ย้อนกลับ" : "Back"}
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1 cursor-pointer"
                onClick={handleNext}
              >
                {slide === totalSlides - 1 ? (
                  t("locale") === "th" ? "เริ่มใช้งานเลย" : "Get Started"
                ) : (
                  <>
                    {t("locale") === "th" ? "ถัดไป" : "Next"}
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
