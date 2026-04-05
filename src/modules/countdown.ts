// First SommerCamp week — update when exact dates are confirmed
const DEPARTURE_DATE = new Date('2026-06-29T09:00:00')

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function tick(
  elDays: HTMLElement,
  elHours: HTMLElement,
  elMinutes: HTMLElement,
  elSeconds: HTMLElement
): void {
  const now = Date.now()
  const diff = DEPARTURE_DATE.getTime() - now

  if (diff <= 0) {
    elDays.textContent = '00'
    elHours.textContent = '00'
    elMinutes.textContent = '00'
    elSeconds.textContent = '00'
    return
  }

  const totalSeconds = Math.floor(diff / 1000)
  const days    = Math.floor(totalSeconds / 86400)
  const hours   = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const update = (el: HTMLElement, value: string) => {
    if (el.textContent !== value) {
      el.textContent = value
      // Brief CSS animation on change
      el.classList.remove('tick')
      // Force reflow to restart animation
      void el.offsetWidth
      el.classList.add('tick')
    }
  }

  update(elDays, String(days))
  update(elHours, pad(hours))
  update(elMinutes, pad(minutes))
  update(elSeconds, pad(seconds))
}

export function initCountdown(): void {
  const elDays    = document.getElementById('cd-days')
  const elHours   = document.getElementById('cd-hours')
  const elMinutes = document.getElementById('cd-minutes')
  const elSeconds = document.getElementById('cd-seconds')

  if (!elDays || !elHours || !elMinutes || !elSeconds) return

  tick(elDays, elHours, elMinutes, elSeconds)
  setInterval(() => tick(elDays, elHours, elMinutes, elSeconds), 1000)
}
