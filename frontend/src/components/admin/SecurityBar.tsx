interface SecurityBarProps {
  roleName: string;
  branchCode: string;
  timeout: string;
}

export default function SecurityBar({ roleName, branchCode, timeout }: SecurityBarProps) {
  return (
    <div className="fixed inset-x-0 top-0 z-[70] flex h-10 items-center justify-between  bg-gradient-to-r from-blue-50 to-white px-4 text-[10px] font-black uppercase tracking-[0.2em] text-blue-700 font-serif">
      <p>Secure Session Active | Role: {roleName}</p>
      <p>Terminal: {branchCode} | Timeout: {timeout}</p>
    </div>
  );
}
