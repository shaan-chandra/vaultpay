// Deterministic bubble definitions so server and client markup always match.
const bubbles = [
  { size: 220, left: 6, delay: 0, duration: 26, opacity: 0.2 },
  { size: 90, left: 18, delay: 6, duration: 19, opacity: 0.28 },
  { size: 44, left: 27, delay: 12, duration: 15, opacity: 0.35 },
  { size: 160, left: 38, delay: 3, duration: 24, opacity: 0.18 },
  { size: 64, left: 49, delay: 9, duration: 17, opacity: 0.3 },
  { size: 28, left: 57, delay: 15, duration: 13, opacity: 0.4 },
  { size: 190, left: 66, delay: 1, duration: 28, opacity: 0.16 },
  { size: 74, left: 78, delay: 7, duration: 20, opacity: 0.26 },
  { size: 36, left: 86, delay: 11, duration: 14, opacity: 0.36 },
  { size: 130, left: 93, delay: 4, duration: 23, opacity: 0.2 },
]

export function BubbleField() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* soft light pools */}
      <div className="bg-primary/45 animate-float absolute -top-40 -left-32 h-[32rem] w-[32rem] rounded-full blur-3xl" />
      <div
        className="bg-accent/25 animate-float absolute -right-24 bottom-[-12rem] h-[28rem] w-[28rem] rounded-full blur-3xl"
        style={{ animationDelay: '-9s' }}
      />

      {/* rising bubbles */}
      {bubbles.map((bubble, index) => (
        <span
          key={index}
          className="animate-rise absolute bottom-0 rounded-full border border-white/25 bg-linear-to-br from-white/35 to-white/0 backdrop-blur-[1px]"
          style={{
            width: bubble.size,
            height: bubble.size,
            left: `${bubble.left}%`,
            opacity: bubble.opacity,
            animationDuration: `${bubble.duration}s`,
            animationDelay: `-${bubble.delay}s`,
          }}
        />
      ))}
    </div>
  )
}
