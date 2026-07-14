// Avatar hráče — obrázek z avatar_url, jinak iniciála v barevném kolečku.
export default function Avatar({ player, size = 32 }) {
  const nick = player?.nick || '?'
  const url = player?.avatar_url
  const style = { width: size, height: size, fontSize: size * 0.42 }
  if (url) {
    return <img className="avatar" src={url} alt={nick} style={style} loading="lazy" />
  }
  return (
    <span className="avatar avatar-fallback" style={style} aria-hidden="true">
      {nick.charAt(0).toUpperCase()}
    </span>
  )
}
