import { useTheme } from '../hooks/useTheme'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle({ compact = false }) {
  const { dark, toggle } = useTheme()
  if (compact) return (
    <button onClick={toggle} className="btn-icon" title={dark ? 'Light mode' : 'Dark mode'}
      style={{background:'transparent', border:'1px solid var(--color-border)'}}>
      {dark ? <Sun size={14} style={{color:'var(--color-muted)'}} /> : <Moon size={14} style={{color:'var(--color-muted)'}} />}
    </button>
  )
  return (
    <button onClick={toggle}
      style={{
        display:'flex', alignItems:'center', gap:'6px',
        padding:'5px 10px 5px 6px',
        borderRadius:'99px',
        border:'1px solid var(--color-border)',
        background:'var(--color-surface)',
        cursor:'pointer', transition:'all 0.15s',
        fontSize:'0.75rem', fontFamily:'DM Sans,sans-serif',
        fontWeight:500, color:'var(--color-muted)',
      }}>
      <span style={{
        display:'flex', alignItems:'center', justifyContent:'center',
        width:22, height:22, borderRadius:'50%',
        background: dark ? 'rgba(91,79,232,0.15)' : 'rgba(255,193,7,0.15)',
        transition:'all 0.2s',
      }}>
        {dark
          ? <Moon size={12} style={{color:'#9490FF'}}/>
          : <Sun  size={12} style={{color:'#D97706'}}/>}
      </span>
      {dark ? 'Dark' : 'Light'}
    </button>
  )
}
