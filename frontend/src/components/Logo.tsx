import { ShieldCheck } from 'lucide-react'
export function Logo({compact=false}:{compact?:boolean}) { return <div className="logo"><span className="logo-mark"><ShieldCheck size={17}/></span>{!compact && <span>Trust<span className="accent-text">Forge</span></span>}</div> }
