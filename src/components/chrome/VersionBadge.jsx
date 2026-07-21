import { getVersion } from '../../lib/version';

export default function VersionBadge() {
  return (
    <div className="fixed bottom-2 left-2 text-white text-xs opacity-60 font-mono z-10">
      v{getVersion()}
    </div>
  );
}
