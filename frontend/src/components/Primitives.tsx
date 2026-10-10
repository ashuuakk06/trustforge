import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight, Check, CircleAlert, Loader2 } from 'lucide-react'

export function Badge({children,tone='neutral'}:{children:ReactNode;tone?:'neutral'|'blue'|'green'|'amber'|'red'|'violet';as?:string}) { return <span className={`badge badge-${tone}`}>{children}</span> }
export function Card({children,className='',onClick}:{children:ReactNode;className?:string;onClick?:()=>void}) { return <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:.3}} onClick={onClick} className={`card ${className}`}>{children}</motion.div> }
export function Stat({label,value,meta,icon:Icon,tone='blue'}:{label:string;value:string|number;meta?:string;icon?:any;tone?:string}) { return <Card className="stat"><div className={`stat-icon ${tone}`}>{Icon && <Icon size={17}/>}</div><div><div className="eyebrow">{label}</div><div className="stat-value">{value}</div>{meta && <div className="muted stat-meta">{meta}</div>}</div></Card> }
export function SectionTitle({eyebrow,title,description,action}:{eyebrow?:string;title:string;description?:string;action?:ReactNode}) { return <div className="section-title"><div>{eyebrow && <div className="eyebrow accent-text">{eyebrow}</div>}<h2>{title}</h2>{description && <p className="muted">{description}</p>}</div>{action}</div> }
export function Loading() { return <div className="loading"><Loader2 className="spin" size={20}/> Loading verified data…</div> }
export function ErrorState({message}:{message:string}) { return <div className="empty error-state"><CircleAlert size={24}/><strong>Couldn’t load this view</strong><span>{message}</span></div> }
export function Empty({label='No records yet'}:{label?:string}) { return <div className="empty"><span>{label}</span></div> }
export function Button({children,variant='primary',onClick,type='button',disabled=false}:{children:ReactNode;variant?:'primary'|'ghost'|'outline'|'danger';onClick?:()=>void;type?:'button'|'submit';disabled?:boolean}) { return <button type={type} disabled={disabled} onClick={onClick} className={`button button-${variant}`}>{children}</button> }
export function Meter({value,label}:{value:number;label?:string}) { return <div className="meter-wrap">{label && <div className="meter-label"><span>{label}</span><span>{value}%</span></div>}<div className="meter"><span style={{width:`${Math.min(100,Math.max(0,value))}%`}}/></div></div> }
export function Verified({children='Verified'}:{children?:ReactNode}) { return <span className="verified"><Check size={13}/>{children}</span> }
export function Linkish({children}:{children:ReactNode}) { return <span className="linkish">{children}<ArrowUpRight size={14}/></span> }
