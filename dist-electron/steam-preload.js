"use strict";const t=require("electron");console.log("Steam Preload Script Loaded");t.ipcRenderer.on("show-dashboard-button",()=>{console.log("Received show-dashboard-button command"),o()});function o(){if(document.getElementById("steam-dashboard-fab"))return;if(!document.body){console.log("Document body not ready, retrying in 100ms"),setTimeout(o,100);return}console.log("Injecting Dashboard Button");const e=document.createElement("button");e.id="steam-dashboard-fab",e.innerHTML=`
    <span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="7" height="7"></rect>
        <rect x="14" y="3" width="7" height="7"></rect>
        <rect x="3" y="14" width="7" height="7"></rect>
        <rect x="14" y="14" width="7" height="7"></rect>
      </svg>
    </span>
    <span>DASHBOARD</span>
  `,e.style.cssText=`
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
  `,e.onmouseover=()=>{e.style.transform="translateY(-2px)",e.style.background="#fff",e.style.color="#000",e.style.boxShadow="0 10px 28px rgba(0,0,0,0.4)"},e.onmouseout=()=>{e.style.transform="translateY(0)",e.style.background="rgba(0,0,0,0.92)",e.style.color="#fff",e.style.boxShadow="0 8px 24px rgba(0,0,0,0.32)"},e.onclick=()=>{console.log("Dashboard button clicked"),t.ipcRenderer.send("toggle-dashboard",!0)},document.body.appendChild(e)}
