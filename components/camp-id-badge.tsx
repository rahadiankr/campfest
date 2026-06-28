import { QRCodeSVG } from "qrcode.react";
import type { CSSProperties } from "react";

interface CampIdBadgeProps {
  readonly avatarUrl: string | null;
  readonly churchName: string | null;
  readonly fullName: string;
  readonly groupColor: string | null;
  readonly groupName: string | null;
  readonly qrCode: string;
}

const getInitials = (fullName: string): string => {
  const words = fullName.trim().split(/\s+/);
  const firstWord = words[0];

  if (firstWord === undefined || firstWord.length === 0) {
    return "CP";
  }

  const secondWord = words[1];
  const firstInitial = firstWord.charAt(0);

  if (secondWord === undefined || secondWord.length === 0) {
    return firstInitial.toUpperCase();
  }

  return `${firstInitial}${secondWord.charAt(0)}`.toUpperCase();
};

const formatCampCode = (qrCode: string): string => {
  const codeFragment = qrCode.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4);

  return `CMP-${codeFragment.toUpperCase()}`;
};

const getAvatarStyle = (avatarUrl: string | null): CSSProperties | undefined => {
  if (avatarUrl === null) {
    return undefined;
  }

  try {
    new URL(avatarUrl);
  } catch {
    return undefined;
  }

  return {
    backgroundImage: `url("${avatarUrl}")`,
  };
};

const getGroupStyle = (groupColor: string | null): CSSProperties | undefined => {
  if (groupColor === null || groupColor.trim().length === 0) {
    return undefined;
  }

  return {
    backgroundColor: groupColor,
  };
};

export function CampIdBadge({
  avatarUrl,
  churchName,
  fullName,
  groupColor,
  groupName,
  qrCode,
}: CampIdBadgeProps) {
  const avatarStyle = getAvatarStyle(avatarUrl);
  const hasAvatar = avatarStyle !== undefined;
  const campCode = formatCampCode(qrCode);
  const initials = getInitials(fullName);

  return (
    <section className="relative overflow-hidden rounded-lg border-2 border-dashed border-cp-amber bg-card px-5 pb-5 pt-8 text-cp-pine">
      <div className="absolute left-1/2 top-3 h-3 w-14 -translate-x-1/2 rounded-full border border-cp-khaki bg-background" />

      <div className="flex flex-col items-center gap-4 text-center">
        <div
          aria-label={hasAvatar ? `${fullName} avatar` : undefined}
          className="flex size-24 items-center justify-center rounded-full border-4 border-cp-khaki bg-cp-moss bg-cover bg-center font-heading text-4xl leading-none tracking-normal text-card"
          style={avatarStyle}
        >
          {hasAvatar ? null : initials}
        </div>

        <div className="space-y-2">
          <p className="font-mono text-xs font-semibold uppercase tracking-normal text-cp-moss">
            {campCode}
          </p>
          <h2 className="font-heading text-5xl leading-none tracking-normal text-cp-pine">
            {fullName}
          </h2>
          <p className="text-sm font-medium text-muted-foreground">
            {churchName === null ? "Gereja belum diisi" : churchName}
          </p>
        </div>

        <div
          className="rounded-full bg-cp-moss px-3 py-1 text-xs font-semibold text-card"
          style={getGroupStyle(groupColor)}
        >
          {groupName === null ? "Kelompok belum tersedia" : groupName}
        </div>

        <div className="rounded-lg border border-cp-khaki bg-white p-3">
          <QRCodeSVG
            bgColor="#FFFFFF"
            fgColor="#1F3A2E"
            level="M"
            marginSize={2}
            size={168}
            title={`QR profile ${fullName}`}
            value={qrCode}
          />
        </div>

        <p className="font-mono text-[11px] uppercase tracking-normal text-muted-foreground">
          Scan untuk connect
        </p>
      </div>
    </section>
  );
}
