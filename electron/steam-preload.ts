import { ipcRenderer } from 'electron'

console.log('Steam Preload Script Loaded')

// Listen for the command to show the button
ipcRenderer.on('show-dashboard-button', () => {
  console.log('Received show-dashboard-button command')
  injectButton()
})

function injectButton() {
  // Check if button already exists
  if (document.getElementById('steam-dashboard-fab')) return

  // Wait for body if not ready
  if (!document.body) {
    console.log('Document body not ready, retrying in 100ms')
    setTimeout(injectButton, 100)
    return
  }

  console.log('Injecting Dashboard Button')

  const btn = document.createElement('button')
  btn.id = 'steam-dashboard-fab'
  btn.innerHTML = `
    <span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="7" height="7"></rect>
        <rect x="14" y="3" width="7" height="7"></rect>
        <rect x="3" y="14" width="7" height="7"></rect>
        <rect x="14" y="14" width="7" height="7"></rect>
      </svg>
    </span>
    <span>DASHBOARD</span>
  `
  
  // Minimalist Design: Black & White, Brutalist
  btn.style.cssText = `
    position: fixed;
    top: 18px;
    right: 18px;
    padding: 10px 14px;
    background: rgba(0,0,0,0.92);
    color: #fff;
    font-weight: 700;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    border: 1px solid rgba(255,255,255,0.18);
    border-radius: 999px;
    cursor: pointer;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    box-shadow: 0 8px 24px rgba(0,0,0,0.32);
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    backdrop-filter: blur(6px);
  `
  
  // Simple hover effect: Invert colors or slight lift
  btn.onmouseover = () => {
    btn.style.transform = 'translateY(-2px)';
    btn.style.background = '#fff';
    btn.style.color = '#000';
    btn.style.boxShadow = '0 10px 28px rgba(0,0,0,0.4)';
  }
  btn.onmouseout = () => {
    btn.style.transform = 'translateY(0)';
    btn.style.background = 'rgba(0,0,0,0.92)';
    btn.style.color = '#fff';
    btn.style.boxShadow = '0 8px 24px rgba(0,0,0,0.32)';
  }
  
  btn.onclick = () => {
    console.log('Dashboard button clicked')
    ipcRenderer.send('toggle-dashboard', true)
  }
  
  document.body.appendChild(btn)
}
