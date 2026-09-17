from pathlib import Path

app_path = Path('app.js')
index_path = Path('index.html')
s = app_path.read_text(encoding='utf-8')

def rep(old, new, name):
    global s
    if old not in s:
        raise SystemExit(f'missing source pattern: {name}')
    s = s.replace(old, new, 1)

rep("  let activeImageBlockId = null;\n  let activeImageLinkBlockId = null;\n  let saveTimer = null;\n",
    "  let activeImageBlockId = null;\n  let activeImageLinkBlockId = null;\n  let pageOperationEpoch = 0;\n  let saveTimer = null;\n", 'operation epoch')

rep("  function switchVault(id){\n    if(!id || id===activeVaultId || !vaultRegistry.vaults.some(v=>v.id===id)) return;\n    flushHistoryPending(activeVaultId); persistStateNow();\n",
    "  function switchVault(id){\n    if(!id || id===activeVaultId || !vaultRegistry.vaults.some(v=>v.id===id)) return;\n    cancelPageOperations();\n    flushHistoryPending(activeVaultId); persistStateNow();\n", 'switch vault')

rep("      persistStateNow();\n      const id=uid('vault');\n",
    "      cancelPageOperations();\n      persistStateNow();\n      const id=uid('vault');\n", 'create vault')

rep("    persistStateNow();\n    try{ localStorage.removeItem(vaultStorageKey(meta.id)); }catch{}\n",
    "    cancelPageOperations();\n    persistStateNow();\n    try{ localStorage.removeItem(vaultStorageKey(meta.id)); }catch{}\n", 'delete vault')

rep("""  function createTab(pageId, activate=true){
    if (!pageById(pageId)) return null;
    if (!Array.isArray(state.openTabs)) state.openTabs=[];
    const tab={id:uid('tab'),pageId}; state.openTabs.push(tab);
    if (activate){ state.activeTabId=tab.id; state.currentPageId=pageId; }
    return tab;
  }

  function replaceActiveTab(pageId){
    if (!pageById(pageId)) return null;
    if (!Array.isArray(state.openTabs)) state.openTabs=[];
    const tab=state.openTabs.find(t=>t.id===state.activeTabId);
    if (!tab) return createTab(pageId,true);
    tab.pageId=pageId; state.currentPageId=pageId; return tab;
  }

  function activateTab(tabId){
    const tab=(state.openTabs||[]).find(t=>t.id===tabId); if(!tab||!pageById(tab.pageId))return;
    state.activeTabId=tab.id; state.currentPageId=tab.pageId; scheduleSave(); renderAll();
  }
""",
"""  function createTab(pageId, activate=true){
    if (!pageById(pageId)) return null;
    if (!Array.isArray(state.openTabs)) state.openTabs=[];
    const tab={id:uid('tab'),pageId}; state.openTabs.push(tab);
    if (activate){ cancelPageOperations(); state.activeTabId=tab.id; state.currentPageId=pageId; }
    return tab;
  }

  function replaceActiveTab(pageId){
    if (!pageById(pageId)) return null;
    if (!Array.isArray(state.openTabs)) state.openTabs=[];
    const tab=state.openTabs.find(t=>t.id===state.activeTabId);
    if (!tab) return createTab(pageId,true);
    if(tab.pageId!==pageId || state.currentPageId!==pageId) cancelPageOperations();
    tab.pageId=pageId; state.currentPageId=pageId; return tab;
  }

  function activateTab(tabId){
    const tab=(state.openTabs||[]).find(t=>t.id===tabId); if(!tab||!pageById(tab.pageId))return;
    if(state.activeTabId!==tab.id || state.currentPageId!==tab.pageId) cancelPageOperations();
    state.activeTabId=tab.id; state.currentPageId=tab.pageId; scheduleSave(); renderAll();
  }
""", 'tab navigation')

rep("    const wasActive=state.activeTabId===tabId;\n    state.openTabs.splice(index, 1);\n",
    "    const wasActive=state.activeTabId===tabId;\n    if(wasActive) cancelPageOperations();\n    state.openTabs.splice(index, 1);\n", 'close active tab')

rep("if(action==='home'){ state.currentPageId='__home__'; state.activeTabId=null; scheduleSave(); renderAll(); return; }",
    "if(action==='home'){ if(state.currentPageId!=='__home__') cancelPageOperations(); state.currentPageId='__home__'; state.activeTabId=null; scheduleSave(); renderAll(); return; }", 'ribbon home')

rep("if(e.target.closest('[data-action=\"home\"]')){ state.currentPageId='__home__'; state.activeTabId=null; scheduleSave(); renderAll(); return; }",
    "if(e.target.closest('[data-action=\"home\"]')){ if(state.currentPageId!=='__home__') cancelPageOperations(); state.currentPageId='__home__'; state.activeTabId=null; scheduleSave(); renderAll(); return; }", 'home action')

rep("  function deletePage(id){\n    const ids=new Set([id]); let changed=true; while(changed){ changed=false; for(const p of state.pages){ if(p.parentId&&ids.has(p.parentId)&&!ids.has(p.id)){ids.add(p.id); changed=true;} } }\n    state.pages=state.pages.filter(p=>!ids.has(p.id));\n",
    "  function deletePage(id){\n    const ids=new Set([id]); let changed=true; while(changed){ changed=false; for(const p of state.pages){ if(p.parentId&&ids.has(p.parentId)&&!ids.has(p.id)){ids.add(p.id); changed=true;} } }\n    if(ids.has(state.currentPageId)) cancelPageOperations();\n    state.pages=state.pages.filter(p=>!ids.has(p.id));\n", 'delete current page')

rep("  function commitImageUrl(id,input){\n    const b=findBlock(id); if(!b||!input)return;\n    const editor=input.closest('[data-image-url-editor]');\n",
    "  function commitImageUrl(id,input){\n    const b=findBlock(id); if(!b||!input)return;\n    const operationEpoch=pageOperationEpoch, pageId=state.currentPageId;\n    const editor=input.closest('[data-image-url-editor]');\n", 'image url operation')

rep("""    const done=(ok)=>{
      if(finished)return; finished=true; clearTimeout(timer); editor?.classList.remove('loading');
      if(!ok){ if(error) error.textContent='This URL could not be loaded as an image. Try a direct public .jpg, .png, .webp, .gif, or other image URL.'; input.focus(); return; }
      b.src=url; b.alt=b.alt||imageAltFromUrl(url); activeImageLinkBlockId=null; scheduleSave(); renderBlocks(currentPage()); toast('Image embedded');
    };
""",
"""    const done=(ok)=>{
      if(finished)return; finished=true; clearTimeout(timer);
      if(operationEpoch!==pageOperationEpoch || state.currentPageId!==pageId) return;
      editor?.classList.remove('loading');
      if(!ok){ if(error) error.textContent='This URL could not be loaded as an image. Try a direct public .jpg, .png, .webp, .gif, or other image URL.'; input.focus(); return; }
      const current=findBlock(id); if(!current)return;
      current.src=url; current.alt=current.alt||imageAltFromUrl(url); activeImageLinkBlockId=null; scheduleSave(); renderBlocks(currentPage()); toast('Image embedded');
    };
""", 'image url completion')

rep("  function loadImageFileIntoBlock(file,id){\n    if(!file?.type?.startsWith('image/')){ toast('That file is not an image.'); return; }\n    if(file.size > 2.5*1024*1024){ toast('Use an image smaller than 2.5 MB for local persistence.'); return; }\n    const reader=new FileReader();\n    reader.onload=()=>{ const b=findBlock(id); if(!b)return; b.type='image'; b.src=String(reader.result); b.alt=file.name.replace(/\\.[^.]+$/,''); b.caption=b.caption||''; delete b.text; scheduleSave(); renderBlocks(currentPage()); };\n",
    "  function loadImageFileIntoBlock(file,id){\n    if(!file?.type?.startsWith('image/')){ toast('That file is not an image.'); return; }\n    if(file.size > 2.5*1024*1024){ toast('Use an image smaller than 2.5 MB for local persistence.'); return; }\n    const operationEpoch=pageOperationEpoch, pageId=state.currentPageId;\n    const reader=new FileReader();\n    reader.onload=()=>{ if(operationEpoch!==pageOperationEpoch || state.currentPageId!==pageId)return; const b=findBlock(id); if(!b)return; b.type='image'; b.src=String(reader.result); b.alt=file.name.replace(/\\.[^.]+$/,''); b.caption=b.caption||''; delete b.text; scheduleSave(); renderBlocks(currentPage()); };\n", 'local image load')

rep("  function setPageIcon(icon){ const p=currentPage(); if(!p)return; p.icon=icon; scheduleSave(); els.pageMetaMenu.classList.add('hidden'); renderPage(); renderSidebar(); renderTabs(); renderRightSidebar(); }\n",
    "  function setPageIcon(icon,pageId=state.currentPageId){ const p=pageById(pageId); if(!p || state.currentPageId!==pageId)return; p.icon=icon; scheduleSave(); els.pageMetaMenu.classList.add('hidden'); renderPage(); renderSidebar(); renderTabs(); renderRightSidebar(); }\n", 'page icon target')

rep("    const img=new Image(); let settled=false;\n    const finish=(ok)=>{ if(settled)return; settled=true; if(ok)setPageIcon(url); else toast('Could not load that icon'); };\n",
    "    const operationEpoch=pageOperationEpoch, pageId=state.currentPageId;\n    const img=new Image(); let settled=false;\n    const finish=(ok)=>{ if(settled)return; settled=true; if(operationEpoch!==pageOperationEpoch || state.currentPageId!==pageId)return; if(ok)setPageIcon(url,pageId); else toast('Could not load that icon'); };\n", 'external icon url')

rep("  function loadPageIconFile(file){\n    if(!file)return;\n    const allowed=file.type.startsWith('image/') || /\\.(svg|png|jpe?g|webp|gif|ico)$/i.test(file.name||'');\n",
    "  function loadPageIconFile(file){\n    if(!file)return;\n    const operationEpoch=pageOperationEpoch, pageId=state.currentPageId;\n    const allowed=file.type.startsWith('image/') || /\\.(svg|png|jpe?g|webp|gif|ico)$/i.test(file.name||'');\n", 'external icon file')

rep("    reader.onload=()=>{ const data=String(reader.result||''); if(!isExternalPageIcon(data)){ toast('Unsupported icon file'); return; } setPageIcon(data); };\n",
    "    reader.onload=()=>{ if(operationEpoch!==pageOperationEpoch || state.currentPageId!==pageId)return; const data=String(reader.result||''); if(!isExternalPageIcon(data)){ toast('Unsupported icon file'); return; } setPageIcon(data,pageId); };\n", 'external icon read')

rep("  function renderCurrentBlocksKeepFocus(){ renderBlocks(currentPage()); }\n  function hideFloatingMenus(){ els.slashMenu.classList.add('hidden'); hideEmojiMenu(); els.blockMenu.classList.add('hidden'); els.pageMetaMenu?.classList.add('hidden'); activeSlashBlockId=null; }\n",
    "  function renderCurrentBlocksKeepFocus(){ renderBlocks(currentPage()); }\n  function hideFloatingMenus(){ els.slashMenu.classList.add('hidden'); hideEmojiMenu(); els.blockMenu.classList.add('hidden'); els.pageMetaMenu?.classList.add('hidden'); activeSlashBlockId=null; }\n  function cancelPageOperations(){\n    pageOperationEpoch+=1;\n    hideFloatingMenus();\n    clearExternalIconDropState();\n    activeImageBlockId=null; activeImageLinkBlockId=null;\n    if(els.imageFileInput) els.imageFileInput.value='';\n    if(els.pageIconFileInput) els.pageIconFileInput.value='';\n    if(els.pageComments){ els.pageComments.classList.add('hidden'); els.pageComments.innerHTML=''; }\n    els.commandPalette?.classList.add('hidden');\n    els.shareModal?.classList.add('hidden');\n    els.settingsModal?.classList.add('hidden');\n    if(els.vaultDialog && !els.vaultDialog.classList.contains('hidden')) closeVaultDialog();\n    clearDragState();\n    const active=document.activeElement;\n    if(active && active!==document.body && typeof active.blur==='function') active.blur();\n    try{ window.getSelection()?.removeAllRanges(); }catch{}\n  }\n", 'cancel helper')

app_path.write_text(s, encoding='utf-8')

html = index_path.read_text(encoding='utf-8')
start = html.rfind('<script>')
end = html.rfind('</script>')
if start < 0 or end < 0 or end <= start:
    raise SystemExit('standalone script not found')
html = html[:start + len('<script>')] + '\n' + s.rstrip() + '\n' + html[end:]
index_path.write_text(html, encoding='utf-8')
