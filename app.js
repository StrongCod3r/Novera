(() => {
  'use strict';

  const LEGACY_STORAGE_KEY = 'noteflow-workspace-v1';
  const VAULTS_KEY = 'noteflow-vaults-v1';
  const vaultStorageKey = id => `noteflow-vault:${id}`;
  const uid = (prefix = 'id') => `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
  const clone = obj => JSON.parse(JSON.stringify(obj));

  const DEFAULT_WORKSPACE = {
    name: "StrongCod3r's Space",
    theme: 'system',
    currentPageId: 'welcome',
    activeTabId: 'tab_welcome',
    openTabs: [{ id:'tab_welcome', pageId:'welcome' }],
    sidebarOpen: true,
    leftPanelMode: 'files',
    pages: [
      {
        id: 'welcome', parentId: null, title: 'Getting started', icon: '👋', favorite: true,
        expanded: true,
        blocks: [
          { id:'b1', type:'text', text:'Welcome to Novera — a fast, local-first workspace built with plain HTML, CSS and JavaScript.' },
          { id:'b2', type:'h2', text:'What you can do' },
          { id:'b3', type:'bullet', text:'Create pages and nest them in the sidebar.' },
          { id:'b4', type:'bullet', text:'Write with blocks, use slash commands, and drag blocks to reorder them.' },
          { id:'b5', type:'bullet', text:'Create simple databases, to-do lists, toggles, quotes, code and callouts.' },
          { id:'b6', type:'callout', text:'Tip: press Ctrl/Cmd + K to search. Type / in any empty block for the block menu.' },
          { id:'b7', type:'h2', text:'Project roadmap' },
          { id:'b8', type:'database', title:'Tasks', columns:['Name','Status','Owner'], rows:[['Polish editor','In progress','You'],['Build templates','Done','You'],['Ship MVP','Next','You']] },
          { id:'b9', type:'h2', text:'Keyboard shortcuts' },
          { id:'b10', type:'text', text:'Enter creates a block · Backspace on an empty block merges/removes it · Ctrl/Cmd+K opens search · Ctrl/Cmd+Shift+L toggles theme.' }
        ]
      },
      {
        id: 'product', parentId: null, title: 'Product', icon: '🚀', favorite: true, expanded: true,
        blocks: [
          { id:'p1', type:'h1', text:'Product hub' },
          { id:'p2', type:'text', text:'Keep specs, decisions, milestones and launch plans together.' },
          { id:'p3', type:'h2', text:'This week' },
          { id:'p4', type:'todo', text:'Finalize editor interactions', checked:true },
          { id:'p5', type:'todo', text:'Review the landing page', checked:false },
          { id:'p6', type:'todo', text:'Prepare launch notes', checked:false }
        ]
      },
      {
        id:'roadmap', parentId:'product', title:'Roadmap', icon:'🗺️', favorite:false, expanded:true,
        blocks:[
          {id:'r1',type:'text',text:'A lightweight product roadmap.'},
          {id:'r2',type:'database',title:'Roadmap',columns:['Feature','Stage','Priority'],rows:[['Offline workspace','Shipped','High'],['Realtime collaboration','Planned','High'],['Calendar view','Planned','Medium']]}
        ]
      },
      {
        id:'notes', parentId:null, title:'Meeting notes', icon:'📝', favorite:false, expanded:true,
        blocks:[
          {id:'n1',type:'h2',text:'Weekly sync'},
          {id:'n2',type:'text',text:'Add meeting notes here.'},
          {id:'n3',type:'quote',text:'Write decisions down while context is fresh.'}
        ]
      }
    ]
  };

  const BLOCK_TYPES = [
    { type:'text', icon:'T', name:'Text', desc:'Plain text block', group:'Basic' },
    { type:'page', icon:'📄', name:'Page', desc:'Create a subpage inside this note', group:'Basic' },
    { type:'link', icon:'🔗', name:'Link', desc:'Add an editable hyperlink', group:'Basic' },
    { type:'h1', icon:'H1', name:'Heading 1', desc:'Large section heading', group:'Basic' },
    { type:'h2', icon:'H2', name:'Heading 2', desc:'Medium section heading', group:'Basic' },
    { type:'h3', icon:'H3', name:'Heading 3', desc:'Small section heading', group:'Basic' },
    { type:'bullet', icon:'•', name:'Bulleted list', desc:'Create a simple bulleted list', group:'Basic' },
    { type:'number', icon:'1.', name:'Numbered list', desc:'Create a numbered list', group:'Basic' },
    { type:'todo', icon:'☑', name:'To-do list', desc:'Track tasks with a checkbox', group:'Basic' },
    { type:'toggle', icon:'▸', name:'Toggle list', desc:'Collapsible content', group:'Basic' },
    { type:'quote', icon:'❝', name:'Quote', desc:'Capture a quote', group:'Advanced' },
    { type:'callout', icon:'💡', name:'Callout', desc:'Highlight useful information', group:'Advanced' },
    { type:'code', icon:'</>', name:'Code', desc:'Code snippet', group:'Advanced' },
    { type:'divider', icon:'—', name:'Divider', desc:'Horizontal separator', group:'Advanced' },
    { type:'image', icon:'🖼️', name:'Image', desc:'Upload or embed an image', group:'Media' },
    { type:'table', icon:'▦', name:'Table', desc:'Simple editable table', group:'Layout' },
    { type:'columns', icon:'▥', name:'Columns', desc:'Arrange blocks side by side', group:'Layout' },
    { type:'database', icon:'▦', name:'Table database', desc:'Editable inline database', group:'Database' }
  ];

  const CODE_LANGUAGES = [
    ['plain','Plain text'],['bash','Bash'],['javascript','JavaScript'],['typescript','TypeScript'],['html','HTML'],['css','CSS'],['json','JSON'],['csharp','C#'],['cpp','C / C++'],['python','Python'],['sql','SQL'],['java','Java'],['rust','Rust'],['go','Go'],['xml','XML'],['yaml','YAML'],['markdown','Markdown'],['mermaid','Mermaid']
  ];
  const CODE_KEYWORDS = {
    javascript:'break case catch class const continue debugger default delete do else export extends finally for function if import in instanceof let new return static super switch this throw try typeof var void while with yield async await of true false null undefined',
    typescript:'abstract any as asserts bigint boolean break case catch class const constructor continue declare default delete do else enum export extends false finally for from function get if implements import in infer instanceof interface is keyof let module namespace never new null number object of private protected public readonly require return set static string super switch symbol this throw true try type typeof undefined unique unknown var void while with yield async await',
    csharp:'abstract as base bool break byte case catch char checked class const continue decimal default delegate do double else enum event explicit extern false finally fixed float for foreach goto if implicit in int interface internal is lock long namespace new null object operator out override params private protected public readonly ref return sbyte sealed short sizeof stackalloc static string struct switch this throw true try typeof uint ulong unchecked unsafe ushort using virtual void volatile while async await record var',
    cpp:'alignas alignof and asm auto bitand bitor bool break case catch char class compl concept const consteval constexpr constinit const_cast continue co_await co_return co_yield decltype default delete do double dynamic_cast else enum explicit export extern false float for friend goto if inline int long mutable namespace new noexcept not nullptr operator or private protected public register reinterpret_cast requires return short signed sizeof static static_assert static_cast struct switch template this thread_local throw true try typedef typeid typename union unsigned using virtual void volatile wchar_t while xor',
    python:'and as assert async await break class continue def del elif else except False finally for from global if import in is lambda None nonlocal not or pass raise return True try while with yield',
    bash:'if then else elif fi case esac for select while until do done in function time coproc true false',
    sql:'select from where join inner left right full outer on as insert into values update set delete create alter drop table view index primary key foreign references null not and or group by order having limit offset distinct union all case when then else end asc desc with',
    java:'abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while true false null',
    rust:'as async await break const continue crate dyn else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while',
    go:'break default func interface select case defer go map struct chan else goto package switch const fallthrough if range type continue for import return var true false nil',
    css:'important inherit initial unset revert auto none block inline flex grid absolute relative fixed sticky',
    yaml:'true false null yes no on off',
    markdown:'true false null',
    mermaid:'flowchart graph sequenceDiagram classDiagram stateDiagram-v2 erDiagram journey gantt pie quadrantChart requirementDiagram gitGraph mindmap timeline sankey-beta xychart-beta block-beta packet-beta architecture-beta C4Context C4Container C4Component C4Dynamic subgraph end participant actor loop alt else opt par rect critical break note autonumber title section direction TB TD BT RL LR class classDef state click style linkStyle %% init true false'
  };

  const EMOJI_CATALOG = [
    {emoji:'😀',name:'grinning face smile happy'}, {emoji:'😃',name:'smiley happy joy'}, {emoji:'😄',name:'smile happy laugh'}, {emoji:'😁',name:'grin happy'},
    {emoji:'😆',name:'laugh satisfied'}, {emoji:'😅',name:'sweat smile'}, {emoji:'😂',name:'joy tears laugh'}, {emoji:'🤣',name:'rofl rolling laugh'},
    {emoji:'😊',name:'blush smile'}, {emoji:'🙂',name:'slightly smiling'}, {emoji:'🙃',name:'upside down'}, {emoji:'😉',name:'wink'},
    {emoji:'😍',name:'heart eyes love'}, {emoji:'🥰',name:'love hearts'}, {emoji:'😘',name:'kiss'}, {emoji:'😎',name:'cool sunglasses'},
    {emoji:'🤓',name:'nerd glasses'}, {emoji:'🧐',name:'monocle thinking'}, {emoji:'🤔',name:'thinking'}, {emoji:'🤨',name:'raised eyebrow'},
    {emoji:'😐',name:'neutral'}, {emoji:'😑',name:'expressionless'}, {emoji:'😶',name:'silent'}, {emoji:'🙄',name:'eye roll'},
    {emoji:'😴',name:'sleep sleeping'}, {emoji:'🤯',name:'mind blown explode'}, {emoji:'🥳',name:'party celebrate'}, {emoji:'🤩',name:'star struck'},
    {emoji:'😢',name:'cry sad'}, {emoji:'😭',name:'sob crying'}, {emoji:'😡',name:'angry mad'}, {emoji:'🤬',name:'swearing angry'},
    {emoji:'😱',name:'scream shocked'}, {emoji:'😬',name:'grimace'}, {emoji:'🫠',name:'melting face'}, {emoji:'🫡',name:'salute'},
    {emoji:'👍',name:'thumbs up like yes'}, {emoji:'👎',name:'thumbs down dislike no'}, {emoji:'👏',name:'clap applause'}, {emoji:'🙌',name:'raised hands celebrate'},
    {emoji:'👋',name:'wave hello'}, {emoji:'🤝',name:'handshake deal'}, {emoji:'🙏',name:'pray thanks please'}, {emoji:'💪',name:'muscle strong'},
    {emoji:'👌',name:'ok hand'}, {emoji:'✌️',name:'victory peace'}, {emoji:'🤞',name:'fingers crossed luck'}, {emoji:'👉',name:'point right'},
    {emoji:'👈',name:'point left'}, {emoji:'☝️',name:'point up'}, {emoji:'👇',name:'point down'}, {emoji:'🫶',name:'heart hands love'},
    {emoji:'❤️',name:'red heart love'}, {emoji:'🧡',name:'orange heart'}, {emoji:'💛',name:'yellow heart'}, {emoji:'💚',name:'green heart'},
    {emoji:'💙',name:'blue heart'}, {emoji:'💜',name:'purple heart'}, {emoji:'🖤',name:'black heart'}, {emoji:'🤍',name:'white heart'},
    {emoji:'💔',name:'broken heart'}, {emoji:'💯',name:'hundred perfect'}, {emoji:'💥',name:'boom collision'}, {emoji:'✨',name:'sparkles shine'},
    {emoji:'⭐',name:'star favorite'}, {emoji:'🌟',name:'glowing star'}, {emoji:'🔥',name:'fire hot'}, {emoji:'⚡',name:'lightning bolt fast'},
    {emoji:'☀️',name:'sun sunny'}, {emoji:'🌤️',name:'sun cloud weather'}, {emoji:'☁️',name:'cloud'}, {emoji:'🌧️',name:'rain weather'},
    {emoji:'❄️',name:'snow cold'}, {emoji:'🌈',name:'rainbow'}, {emoji:'🌙',name:'moon night'}, {emoji:'🌍',name:'earth world globe'},
    {emoji:'🌱',name:'seedling grow'}, {emoji:'🌿',name:'herb leaf'}, {emoji:'🌳',name:'tree nature'}, {emoji:'🌸',name:'flower blossom'},
    {emoji:'🍀',name:'clover luck'}, {emoji:'🐱',name:'cat'}, {emoji:'🐶',name:'dog'}, {emoji:'🦊',name:'fox'},
    {emoji:'🐼',name:'panda'}, {emoji:'🐸',name:'frog'}, {emoji:'🦄',name:'unicorn'}, {emoji:'🐉',name:'dragon'},
    {emoji:'☕',name:'coffee drink'}, {emoji:'🍵',name:'tea drink'}, {emoji:'🍕',name:'pizza food'}, {emoji:'🍔',name:'burger food'},
    {emoji:'🍎',name:'apple food'}, {emoji:'🍓',name:'strawberry fruit'}, {emoji:'🍰',name:'cake dessert'}, {emoji:'🎂',name:'birthday cake'},
    {emoji:'🚀',name:'rocket launch'}, {emoji:'✈️',name:'airplane travel'}, {emoji:'🚗',name:'car vehicle'}, {emoji:'🚲',name:'bike bicycle'},
    {emoji:'🏠',name:'house home'}, {emoji:'🏢',name:'office building'}, {emoji:'🏆',name:'trophy winner'}, {emoji:'🥇',name:'gold medal winner'},
    {emoji:'🎯',name:'target goal'}, {emoji:'🎮',name:'game controller gaming'}, {emoji:'🎲',name:'dice game'}, {emoji:'🎵',name:'music note'},
    {emoji:'🎧',name:'headphones audio'}, {emoji:'🎬',name:'movie cinema'}, {emoji:'📷',name:'camera photo'}, {emoji:'🎨',name:'art palette design'},
    {emoji:'💡',name:'idea light bulb'}, {emoji:'🧠',name:'brain think'}, {emoji:'👀',name:'eyes look watch'}, {emoji:'🔍',name:'search magnify'},
    {emoji:'🔎',name:'search right magnify'}, {emoji:'🔔',name:'bell notification'}, {emoji:'📌',name:'pin pinned'}, {emoji:'📍',name:'location pin'},
    {emoji:'📄',name:'page document file'}, {emoji:'📝',name:'memo note write'}, {emoji:'📚',name:'books library'}, {emoji:'📖',name:'book read'},
    {emoji:'📁',name:'folder files'}, {emoji:'🗂️',name:'card index folders'}, {emoji:'📊',name:'chart analytics'}, {emoji:'📈',name:'chart up growth'},
    {emoji:'📉',name:'chart down'}, {emoji:'📅',name:'calendar date'}, {emoji:'🗓️',name:'calendar schedule'}, {emoji:'⏰',name:'alarm clock time'},
    {emoji:'⌛',name:'hourglass time'}, {emoji:'✅',name:'check done complete'}, {emoji:'☑️',name:'checkbox done'}, {emoji:'❌',name:'cross x no'},
    {emoji:'⚠️',name:'warning alert'}, {emoji:'🚨',name:'siren alert'}, {emoji:'❓',name:'question help'}, {emoji:'❗',name:'exclamation important'},
    {emoji:'➕',name:'plus add'}, {emoji:'➖',name:'minus remove'}, {emoji:'➡️',name:'arrow right'}, {emoji:'⬅️',name:'arrow left'},
    {emoji:'⬆️',name:'arrow up'}, {emoji:'⬇️',name:'arrow down'}, {emoji:'🔗',name:'link chain'}, {emoji:'🔒',name:'lock private secure'},
    {emoji:'🔓',name:'unlock open'}, {emoji:'🔑',name:'key access'}, {emoji:'🛠️',name:'tools build'}, {emoji:'🔧',name:'wrench tool'},
    {emoji:'⚙️',name:'gear settings'}, {emoji:'🧰',name:'toolbox'}, {emoji:'💻',name:'laptop computer code'}, {emoji:'🖥️',name:'desktop computer'},
    {emoji:'⌨️',name:'keyboard'}, {emoji:'🖱️',name:'mouse computer'}, {emoji:'📱',name:'phone mobile'}, {emoji:'🔋',name:'battery power'},
    {emoji:'🧩',name:'puzzle component'}, {emoji:'🧪',name:'test tube experiment'}, {emoji:'🔬',name:'microscope science'}, {emoji:'🧬',name:'dna science'},
    {emoji:'🤖',name:'robot bot ai'}, {emoji:'👾',name:'alien monster game'}, {emoji:'💾',name:'disk save'}, {emoji:'🗄️',name:'database cabinet'},
    {emoji:'🗺️',name:'map roadmap'}, {emoji:'🧭',name:'compass direction'}, {emoji:'💬',name:'comment chat'}, {emoji:'🗨️',name:'speech chat'},
    {emoji:'📣',name:'megaphone announce'}, {emoji:'✉️',name:'mail email'}, {emoji:'📦',name:'package box'}, {emoji:'🎁',name:'gift present'},
    {emoji:'🔖',name:'bookmark'}, {emoji:'🏷️',name:'tag label'}, {emoji:'💰',name:'money bag'}, {emoji:'💳',name:'credit card'},
    {emoji:'🪙',name:'coin money'}, {emoji:'📎',name:'paperclip attachment'}, {emoji:'✏️',name:'pencil edit'}, {emoji:'✍️',name:'writing hand'},
    {emoji:'🧹',name:'broom clean'}, {emoji:'🗑️',name:'trash delete'}, {emoji:'🕹️',name:'joystick game'}, {emoji:'🎙️',name:'microphone audio'}
  ];
  const ICON_OPTIONS = EMOJI_CATALOG.map(item=>item.emoji);

  function isExternalPageIcon(icon){
    const value=String(icon||'').trim();
    return /^https?:\/\//i.test(value) || /^data:image\/(?:png|jpe?g|webp|gif|svg\+xml|x-icon|vnd\.microsoft\.icon)[;,]/i.test(value);
  }
  function pageIconMarkup(icon,fallback='📄'){
    const value=String(icon||fallback||'');
    if(isExternalPageIcon(value)) return `<img class="external-page-icon" src="${escapeHtml(value)}" alt="" draggable="false">`;
    return escapeHtml(value);
  }
  function normalizeExternalIconUrl(value){
    let raw=String(value||'').trim();
    if(!raw) return '';
    if(/^data:image\/(?:png|jpe?g|webp|gif|svg\+xml|x-icon|vnd\.microsoft\.icon)[;,]/i.test(raw)) return raw;
    if(!/^[a-z][a-z0-9+.-]*:/i.test(raw)) raw='https://'+raw;
    try{ const u=new URL(raw); return (u.protocol==='http:'||u.protocol==='https:')?u.href:''; }catch{ return ''; }
  }

  let vaultRegistry = loadVaultRegistry();
  let activeVaultId = vaultRegistry.activeVaultId;
  let state = loadState();
  if (typeof state.sidebarOpen !== 'boolean') state.sidebarOpen = true;
  if (typeof state.rightSidebarOpen !== 'boolean') state.rightSidebarOpen = true;
  if (!['files','favorites'].includes(state.leftPanelMode)) state.leftPanelMode = 'files';
  if (!['outline','backlinks'].includes(state.rightPanelMode)) state.rightPanelMode = 'outline';
  if (!Number.isFinite(state.sidebarWidth)) state.sidebarWidth = 276;
  if (!Number.isFinite(state.rightSidebarWidth)) state.rightSidebarWidth = 286;
  let activeSlashBlockId = null;
  let slashIndex = 0;
  let activeEmojiBlockId = null;
  let emojiIndex = 0;
  let emojiTokenStart = -1;
  let emojiTokenEnd = -1;
  let emojiMatches = [];
  let commandIndex = 0;
  let dragBlockId = null;
  let dragTabId = null;
  let tableAxisDrag = null;
  let activeImageBlockId = null;
  let activeImageLinkBlockId = null;
  let pageOperationEpoch = 0;
  let multiBlockSelection = null;
  let selectedTableBlockId = null;
  let tableCellSelection = null;
  let saveTimer = null;
  let historyTimer = null;
  let historySuspended = false;
  const HISTORY_LIMIT = 100;
  const HISTORY_MERGE_DELAY = 650;
  const historyByVault = new Map();

  const $ = id => document.getElementById(id);
  const els = {
    sidebar:$('sidebar'), sidebarToggle:$('sidebarToggle'), sidebarOpen:$('sidebarOpen'), rightSidebar:$('rightSidebar'), rightSidebarContent:$('rightSidebarContent'), rightSidebarToggle:$('rightSidebarToggle'),
    favoritesList:$('favoritesList'), pageTree:$('pageTree'), breadcrumbs:$('breadcrumbs'), editorTabs:$('editorTabs'), tabsScroll:$('tabsScroll'),
    editorView:$('editorView'), homeView:$('homeView'), pageTitle:$('pageTitle'), pageIcon:$('pageIcon'),
    blockEditor:$('blockEditor'), emptyHint:$('emptyHint'), addIconBtn:$('addIconBtn'), addCommentBtn:$('addCommentBtn'), pageComments:$('pageComments'), pageMetaMenu:$('pageMetaMenu'),
    undoBtn:$('undoBtn'), redoBtn:$('redoBtn'), favoriteBtn:$('favoriteBtn'), commandPalette:$('commandPalette'), commandSearch:$('commandSearch'), commandResults:$('commandResults'),
    slashMenu:$('slashMenu'), slashSearch:$('slashSearch'), slashResults:$('slashResults'), emojiMenu:$('emojiMenu'), emojiResults:$('emojiResults'), blockMenu:$('blockMenu'),
    shareModal:$('shareModal'), settingsModal:$('settingsModal'), themeToggle:$('themeToggle'),
    importFile:$('importFile'), imageFileInput:$('imageFileInput'), pageIconFileInput:$('pageIconFileInput'), vaultSelect:$('vaultSelect'), createVaultBtn:$('createVaultBtn'), renameVaultBtn:$('renameVaultBtn'), deleteVaultBtn:$('deleteVaultBtn'),
    vaultDialog:$('vaultDialog'), vaultDialogTitle:$('vaultDialogTitle'), vaultDialogInput:$('vaultDialogInput'), vaultDialogError:$('vaultDialogError'), vaultDialogConfirm:$('vaultDialogConfirm'), toast:$('toast')
  };

  function makeBlankWorkspace(){
    const pageId=uid('page'), tabId=uid('tab');
    return {
      name:'', theme:state?.theme || 'system', currentPageId:pageId, activeTabId:tabId,
      openTabs:[{id:tabId,pageId}], sidebarOpen:true, rightSidebarOpen:true,
      leftPanelMode:'files', rightPanelMode:'outline', sidebarWidth:276, rightSidebarWidth:286,
      pages:[{id:pageId,parentId:null,title:'Untitled',icon:'📄',favorite:false,expanded:true,blocks:[newTextBlock()]}]
    };
  }

  function normalizeWorkspace(parsed){
    if (!parsed?.pages?.length) parsed=clone(DEFAULT_WORKSPACE);
    parsed.pages.forEach(p => { if ('cover' in p) delete p.cover; p.blocks=normalizeBlockTree(p.blocks); });
    const pageIds = new Set(parsed.pages.map(p => p.id));
    if (!Array.isArray(parsed.openTabs)) parsed.openTabs = [];
    parsed.openTabs = parsed.openTabs.map(tab => {
      if (typeof tab === 'string') return pageIds.has(tab) ? {id:uid('tab'), pageId:tab} : null;
      if (!tab || typeof tab !== 'object') return null;
      const pageId = tab.pageId || (pageIds.has(tab.id) ? tab.id : null);
      return pageId && pageIds.has(pageId) ? {id:tab.id && tab.pageId ? tab.id : uid('tab'), pageId} : null;
    }).filter(Boolean);
    if (parsed.currentPageId !== '__home__' && !pageIds.has(parsed.currentPageId)) parsed.currentPageId = parsed.openTabs[0]?.pageId || parsed.pages[0].id;
    if (parsed.currentPageId !== '__home__') {
      let active = parsed.openTabs.find(t => t.id === parsed.activeTabId && t.pageId === parsed.currentPageId) || parsed.openTabs.find(t => t.pageId === parsed.currentPageId);
      if (!active) { active={id:uid('tab'),pageId:parsed.currentPageId}; parsed.openTabs.push(active); }
      parsed.activeTabId = active.id;
    } else parsed.activeTabId = null;
    if (typeof parsed.sidebarOpen !== 'boolean') parsed.sidebarOpen = true;
    if (typeof parsed.rightSidebarOpen !== 'boolean') parsed.rightSidebarOpen = true;
    if (!['files','favorites'].includes(parsed.leftPanelMode)) parsed.leftPanelMode = 'files';
    if (!['outline','backlinks'].includes(parsed.rightPanelMode)) parsed.rightPanelMode = 'outline';
    if (!Number.isFinite(parsed.sidebarWidth)) parsed.sidebarWidth = 276;
    if (!Number.isFinite(parsed.rightSidebarWidth)) parsed.rightSidebarWidth = 286;
    return parsed;
  }

  function loadVaultRegistry(){
    try{
      const saved=JSON.parse(localStorage.getItem(VAULTS_KEY)||'null');
      if(saved?.vaults?.length){
        saved.vaults=saved.vaults.filter(v=>v?.id && v?.name).map(v=>({id:String(v.id),name:String(v.name)}));
        if(saved.vaults.length){
          if(!saved.vaults.some(v=>v.id===saved.activeVaultId)) saved.activeVaultId=saved.vaults[0].id;
          return saved;
        }
      }
    }catch{}
    const id=uid('vault');
    let legacy=null;
    try{ legacy=JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY)||'null'); }catch{}
    const name=(legacy?.name||'StrongCod3r Vault').trim() || 'StrongCod3r Vault';
    const registry={activeVaultId:id,vaults:[{id,name}]};
    try{
      localStorage.setItem(VAULTS_KEY,JSON.stringify(registry));
      localStorage.setItem(vaultStorageKey(id),JSON.stringify(legacy?.pages?.length?legacy:DEFAULT_WORKSPACE));
    }catch{}
    return registry;
  }

  function saveVaultRegistry(){ try{ localStorage.setItem(VAULTS_KEY,JSON.stringify(vaultRegistry)); }catch{} }
  function activeVaultMeta(){ return vaultRegistry.vaults.find(v=>v.id===activeVaultId) || vaultRegistry.vaults[0]; }

  function loadState(){
    try{
      const raw=localStorage.getItem(vaultStorageKey(activeVaultId));
      const parsed=normalizeWorkspace(raw?JSON.parse(raw):clone(DEFAULT_WORKSPACE));
      parsed.name=activeVaultMeta()?.name || parsed.name || 'Vault';
      return parsed;
    }catch{
      const fallback=normalizeWorkspace(clone(DEFAULT_WORKSPACE));
      fallback.name=activeVaultMeta()?.name || 'Vault';
      return fallback;
    }
  }

  function persistStateNow(){
    clearTimeout(saveTimer);
    try { localStorage.setItem(vaultStorageKey(activeVaultId), JSON.stringify(state)); }
    catch { toast('Local storage is full. Try a smaller image or export your workspace.'); }
  }

  function snapshotsEqual(a,b){
    try { return JSON.stringify(a)===JSON.stringify(b); } catch { return false; }
  }

  function historyForVault(vaultId=activeVaultId){
    let history=historyByVault.get(vaultId);
    if(!history){
      history={undo:[],redo:[],present:clone(state),pending:null};
      historyByVault.set(vaultId,history);
    }
    return history;
  }

  function initializeHistoryForVault(vaultId=activeVaultId,{reset=false}={}){
    if(reset || !historyByVault.has(vaultId)) historyByVault.set(vaultId,{undo:[],redo:[],present:clone(state),pending:null});
    else {
      const history=historyByVault.get(vaultId);
      history.present=clone(state); history.pending=null;
    }
    updateHistoryButtons();
  }

  function pushUndoSnapshot(history,snapshot){
    history.undo.push(clone(snapshot));
    if(history.undo.length>HISTORY_LIMIT) history.undo.splice(0,history.undo.length-HISTORY_LIMIT);
  }

  function flushHistoryPending(vaultId=activeVaultId){
    clearTimeout(historyTimer); historyTimer=null;
    const history=historyByVault.get(vaultId); if(!history?.pending) return;
    const {before,after}=history.pending; history.pending=null;
    if(!snapshotsEqual(before,after)){
      pushUndoSnapshot(history,before);
      history.present=clone(after);
      history.redo=[];
    }
    updateHistoryButtons();
  }

  function recordHistory(mode='immediate'){
    if(historySuspended) return;
    const history=historyForVault();
    const current=clone(state);
    if(mode==='merge'){
      if(!history.pending) history.pending={before:clone(history.present),after:current};
      else history.pending.after=current;
      clearTimeout(historyTimer);
      const vaultId=activeVaultId;
      historyTimer=setTimeout(()=>flushHistoryPending(vaultId),HISTORY_MERGE_DELAY);
      updateHistoryButtons();
      return;
    }
    flushHistoryPending(activeVaultId);
    if(!snapshotsEqual(history.present,current)){
      pushUndoSnapshot(history,history.present);
      history.present=current;
      history.redo=[];
    }
    updateHistoryButtons();
  }

  function scheduleSave(mode='immediate'){
    recordHistory(mode);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persistStateNow, 120);
  }

  function updateHistoryButtons(){
    const history=historyByVault.get(activeVaultId);
    const canUndo=!!history && (history.undo.length>0 || !!history.pending);
    const canRedo=!!history && history.redo.length>0;
    if(els.undoBtn){ els.undoBtn.disabled=!canUndo; els.undoBtn.title=canUndo?'Undo (Ctrl/Cmd+Z)':'Nothing to undo'; }
    if(els.redoBtn){ els.redoBtn.disabled=!canRedo; els.redoBtn.title=canRedo?'Redo (Ctrl/Cmd+Shift+Z / Ctrl+Y)':'Nothing to redo'; }
  }

  function undoWorkspace(){
    flushHistoryPending(activeVaultId);
    const history=historyForVault(); if(!history.undo.length) return;
    history.redo.push(clone(history.present));
    const previous=history.undo.pop();
    historySuspended=true;
    state=normalizeWorkspace(clone(previous));
    history.present=clone(state); history.pending=null;
    persistStateNow(); applyTheme(); renderAll();
    historySuspended=false; updateHistoryButtons(); toast('Undo');
  }

  function redoWorkspace(){
    flushHistoryPending(activeVaultId);
    const history=historyForVault(); if(!history.redo.length) return;
    pushUndoSnapshot(history,history.present);
    const next=history.redo.pop();
    historySuspended=true;
    state=normalizeWorkspace(clone(next));
    history.present=clone(state); history.pending=null;
    persistStateNow(); applyTheme(); renderAll();
    historySuspended=false; updateHistoryButtons(); toast('Redo');
  }

  function renderVaultSelector(){
    if(!els.vaultSelect) return;
    els.vaultSelect.innerHTML=vaultRegistry.vaults.map(v=>`<option value="${escapeHtml(v.id)}">${escapeHtml(v.name)}</option>`).join('');
    els.vaultSelect.value=activeVaultId;
    if(els.deleteVaultBtn) els.deleteVaultBtn.disabled=vaultRegistry.vaults.length===1;
  }

  function switchVault(id){
    if(!id || id===activeVaultId || !vaultRegistry.vaults.some(v=>v.id===id)) return;
    cancelPageOperations();
    flushHistoryPending(activeVaultId); persistStateNow();
    activeVaultId=id; vaultRegistry.activeVaultId=id; saveVaultRegistry();
    state=loadState(); initializeHistoryForVault(activeVaultId); applyTheme(); renderAll();
    toast(`Vault: ${activeVaultMeta()?.name||'Vault'}`);
  }

  let vaultDialogMode = null;

  function createVault(){ openVaultDialog('create'); }
  function renameVault(){ openVaultDialog('rename'); }

  function openVaultDialog(mode){
    if(!els.vaultDialog || !els.vaultDialogInput) return;
    const meta=activeVaultMeta();
    vaultDialogMode=mode;
    els.vaultDialogTitle.textContent=mode==='rename' ? 'Rename vault' : 'Create vault';
    els.vaultDialogConfirm.textContent=mode==='rename' ? 'Rename' : 'Create';
    els.vaultDialogInput.value=mode==='rename' ? (meta?.name||'') : 'New Vault';
    els.vaultDialogError.textContent='';
    els.vaultDialog.classList.remove('hidden');
    requestAnimationFrame(()=>{ els.vaultDialogInput.focus(); els.vaultDialogInput.select(); });
  }

  function closeVaultDialog(){
    vaultDialogMode=null;
    els.vaultDialog?.classList.add('hidden');
    if(els.vaultDialogError) els.vaultDialogError.textContent='';
  }

  function submitVaultDialog(){
    if(!vaultDialogMode || !els.vaultDialogInput) return;
    const name=els.vaultDialogInput.value.trim();
    if(!name){ els.vaultDialogError.textContent='Enter a vault name.'; els.vaultDialogInput.focus(); return; }
    const duplicate=vaultRegistry.vaults.some(v=>v.name.trim().toLowerCase()===name.toLowerCase() && (vaultDialogMode!=='rename' || v.id!==activeVaultId));
    if(duplicate){ els.vaultDialogError.textContent='A vault with this name already exists.'; els.vaultDialogInput.focus(); els.vaultDialogInput.select(); return; }
    if(vaultDialogMode==='create'){
      cancelPageOperations();
      persistStateNow();
      const id=uid('vault');
      vaultRegistry.vaults.push({id,name}); vaultRegistry.activeVaultId=id; activeVaultId=id; saveVaultRegistry();
      state=makeBlankWorkspace(); state.name=name; initializeHistoryForVault(activeVaultId,{reset:true}); persistStateNow(); applyTheme(); closeVaultDialog(); renderAll();
      requestAnimationFrame(()=>{ els.pageTitle?.focus(); selectAllContent(els.pageTitle); });
      toast('Vault created');
      return;
    }
    const meta=activeVaultMeta(); if(!meta) return closeVaultDialog();
    if(name!==meta.name){ meta.name=name; state.name=name; saveVaultRegistry(); persistStateNow(); renderVaultSelector(); toast('Vault renamed'); }
    closeVaultDialog();
  }

  function deleteVault(){
    const meta=activeVaultMeta(); if(!meta || vaultRegistry.vaults.length<=1) return;
    if(!confirm(`Delete vault "${meta.name}"? This removes its locally stored pages.`)) return;
    cancelPageOperations();
    persistStateNow();
    try{ localStorage.removeItem(vaultStorageKey(meta.id)); }catch{}
    const index=vaultRegistry.vaults.findIndex(v=>v.id===meta.id); vaultRegistry.vaults.splice(index,1);
    const next=vaultRegistry.vaults[Math.max(0,index-1)] || vaultRegistry.vaults[0];
    historyByVault.delete(meta.id); activeVaultId=next.id; vaultRegistry.activeVaultId=next.id; saveVaultRegistry(); state=loadState(); initializeHistoryForVault(activeVaultId); applyTheme(); renderAll(); toast('Vault deleted');
  }

  function currentPage(){ return state.pages.find(p => p.id === state.currentPageId) || state.pages[0]; }
  function pageById(id){ return state.pages.find(p => p.id === id); }
  function childrenOf(id){ return state.pages.filter(p => p.parentId === id); }

  function init(){
    initializeHistoryForVault(activeVaultId,{reset:true});
    applyTheme();
    bindEvents();
    renderAll();
  }

  function renderAll(){
    renderVaultSelector();
    renderSidebar();
    renderTabs();
    if (state.currentPageId === '__home__') renderHome(); else renderPage();
    renderRightSidebar();
    updateWorkspaceChrome();
    updateHistoryButtons();
  }

  function renderTabs(){
    if (!els.tabsScroll) return;
    const validIds = new Set(state.pages.map(p => p.id));
    if (!Array.isArray(state.openTabs)) state.openTabs = [];
    state.openTabs = state.openTabs.map(tab => typeof tab === 'string' ? {id:uid('tab'),pageId:tab} : tab)
      .filter(tab => tab && validIds.has(tab.pageId));
    if (state.currentPageId === '__home__') state.activeTabId = null;
    else if (validIds.has(state.currentPageId)) {
      let active = state.openTabs.find(t => t.id === state.activeTabId && t.pageId === state.currentPageId);
      if (!active) active = state.openTabs.find(t => t.pageId === state.currentPageId);
      if (!active) { active={id:uid('tab'),pageId:state.currentPageId}; state.openTabs.push(active); }
      state.activeTabId = active.id;
    }
    els.tabsScroll.innerHTML = state.openTabs.length ? state.openTabs.map(tab => {
      const p = pageById(tab.pageId); if (!p) return '';
      const active = state.activeTabId === tab.id;
      return `<div class="editor-tab ${active?'active':''}" draggable="true" data-tab-id="${tab.id}" data-page-id="${tab.pageId}" role="tab" aria-selected="${active}" title="${escapeHtml(p.title||'Untitled')}"><span class="tab-icon">${pageIconMarkup(p.icon)}</span><span class="tab-title">${escapeHtml(p.title||'Untitled')}</span><button class="tab-close" data-tab-close="${tab.id}" title="Close" aria-label="Close ${escapeHtml(p.title||'Untitled')}">×</button></div>`;
    }).join('') : `<div class="tabs-empty">No open pages</div>`;
    requestAnimationFrame(() => els.tabsScroll.querySelector('.editor-tab.active')?.scrollIntoView({block:'nearest', inline:'nearest'}));
  }

  function createTab(pageId, activate=true){
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

  function closeTab(tabId){
    if (!Array.isArray(state.openTabs)) state.openTabs = [];
    const index = state.openTabs.findIndex(t=>t.id===tabId);
    if (index < 0) return;
    const wasActive=state.activeTabId===tabId;
    if(wasActive) cancelPageOperations();
    state.openTabs.splice(index, 1);
    if (wasActive){
      const next=state.openTabs[Math.min(index,state.openTabs.length-1)] || null;
      state.activeTabId=next?.id || null; state.currentPageId=next?.pageId || '__home__';
    }
    scheduleSave(); renderAll();
  }

  function cycleTab(direction=1){
    const tabs = state.openTabs || []; if (!tabs.length) return;
    const current = tabs.findIndex(t=>t.id===state.activeTabId);
    const next = current < 0 ? 0 : (current + direction + tabs.length) % tabs.length;
    activateTab(tabs[next].id);
  }

  function updateSidebarState(){ updateWorkspaceChrome(); }

  function updateWorkspaceChrome(){
    document.documentElement.style.setProperty('--sidebar-width', `${Math.max(210,Math.min(420,state.sidebarWidth||276))}px`);
    document.documentElement.style.setProperty('--right-sidebar-width', `${Math.max(220,Math.min(420,state.rightSidebarWidth||286))}px`);
    els.sidebar?.classList.toggle('collapsed', !state.sidebarOpen);
    els.sidebarOpen?.classList.toggle('hidden', state.sidebarOpen);
    els.rightSidebar?.classList.toggle('collapsed', !state.rightSidebarOpen);
    document.querySelector('.left-resizer')?.classList.toggle('hidden-resizer', !state.sidebarOpen);
    document.querySelector('.right-resizer')?.classList.toggle('hidden-resizer', !state.rightSidebarOpen);
    if (els.rightSidebarToggle) els.rightSidebarToggle.textContent = state.rightSidebarOpen ? '◨' : '◧';
    document.querySelectorAll('[data-ribbon-action="files"],[data-ribbon-action="favorites"]').forEach(btn=>{
      btn.classList.toggle('active', state.sidebarOpen && btn.dataset.ribbonAction===state.leftPanelMode);
      btn.setAttribute('aria-pressed', btn.classList.contains('active') ? 'true' : 'false');
    });
    requestAnimationFrame(updateSidebarOverflow);
  }

  function renderRightSidebar(){
    if(!els.rightSidebarContent) return;
    document.querySelectorAll('[data-right-mode]').forEach(btn=>btn.classList.toggle('active',btn.dataset.rightMode===state.rightPanelMode));
    if(state.currentPageId==='__home__'){
      els.rightSidebarContent.innerHTML='<div class="right-empty"><div class="right-empty-icon">◇</div><b>No note selected</b><span>Open a page to see its outline and linked mentions.</span></div>';
      return;
    }
    const page=currentPage(); if(!page) return;
    if(state.rightPanelMode==='backlinks'){
      const needle=(page.title||'').trim().toLowerCase();
      const linked=needle ? state.pages.filter(p=>p.id!==page.id && flattenBlocks(p.blocks||[]).some(b=>`${b.text||''} ${b.caption||''} ${b.url||''}`.toLowerCase().includes(needle))) : [];
      els.rightSidebarContent.innerHTML=`<div class="right-section-title">Linked mentions</div>${linked.length?linked.map(p=>`<button class="backlink-item" data-backlink-page="${p.id}"><span>${pageIconMarkup(p.icon)}</span><span><b>${escapeHtml(p.title||'Untitled')}</b><small>${countWords(p)} words</small></span></button>`).join(''):'<div class="right-empty compact"><span>No backlinks yet.</span><small>Mention this note title in another page to see it here.</small></div>'}`;
      return;
    }
    const heads=flattenBlocks(page.blocks||[]).filter(b=>['h1','h2','h3'].includes(b.type) && (b.text||'').trim());
    els.rightSidebarContent.innerHTML=`<div class="right-section-title">${escapeHtml(page.title||'Untitled')}</div>${heads.length?heads.map(b=>`<button class="outline-item level-${b.type.slice(1)}" data-outline-block="${b.id}">${escapeHtml(b.text)}</button>`).join(''):'<div class="right-empty compact"><span>No headings in this note.</span><small>Add H1, H2 or H3 blocks to build an outline.</small></div>'}`;
  }

  function renderSidebar(){
    const mode=['files','favorites'].includes(state.leftPanelMode) ? state.leftPanelMode : 'files';
    document.querySelectorAll('[data-left-panel]').forEach(panel=>panel.classList.toggle('hidden', panel.dataset.leftPanel!==mode));
    const favs = state.pages.filter(p => p.favorite);
    els.favoritesList.innerHTML = favs.length
      ? favs.map(p => treeRowHTML(p, 0, false)).join('')
      : '<div class="left-sidebar-empty"><span>☆</span><b>No favorites yet</b><small>Star a note to keep it here.</small></div>';
    els.pageTree.innerHTML = state.pages.filter(p => !p.parentId).map(p => treeNodeHTML(p)).join('');
    updateWorkspaceChrome();
    requestAnimationFrame(updateSidebarOverflow);
  }

  function updateSidebarOverflow(){
    const scroller=document.querySelector('.sidebar-scroll'); if(!scroller)return;
    // Measure from a clean, non-scrollable state so a stale scrollbar cannot keep itself alive.
    scroller.classList.remove('can-scroll');
    const overflow=Math.ceil(scroller.scrollHeight-scroller.clientHeight);
    const canScroll=overflow>6;
    scroller.classList.toggle('can-scroll',canScroll);
    if(!canScroll) scroller.scrollTop=0;
  }

  function treeNodeHTML(page){
    const kids = childrenOf(page.id);
    return `${treeRowHTML(page,0,true)}${kids.length && page.expanded !== false ? `<div class="page-children">${kids.map(treeNodeHTML).join('')}</div>` : ''}`;
  }

  function treeRowHTML(page, depth = 0, allowExpand = true){
    const kids = childrenOf(page.id);
    return `<div class="page-tree-row ${page.id===state.currentPageId?'active':''}" data-page-id="${page.id}" style="padding-left:${depth*8}px">
      ${allowExpand && kids.length ? `<button class="tree-expand" data-action="toggle-page" title="Expand" aria-label="${page.expanded===false?'Expand':'Collapse'}">${chevronSvg(page.expanded===false?'right':'down','tree-chevron')}</button>` : `<span style="width:18px"></span>`}
      <button class="tree-page-btn" data-action="open-page" title="Open page · Middle-click for new tab"><span class="tree-icon">${pageIconMarkup(page.icon)}</span><span class="tree-title">${escapeHtml(page.title || 'Untitled')}</span></button>
      <button class="tree-more" data-action="page-more" title="More" aria-label="More"><svg class="more-dots-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="5" cy="12" r="1.6"></circle><circle cx="12" cy="12" r="1.6"></circle><circle cx="19" cy="12" r="1.6"></circle></svg></button>
    </div>`;
  }

  function renderHome(){
    els.editorView.classList.add('hidden');
    els.homeView.classList.remove('hidden');
    els.breadcrumbs.innerHTML = '<span class="crumb">Home</span>';
    const recent = state.pages.slice().reverse().slice(0,6);
    els.homeView.innerHTML = `<div class="home-inner">
      <h1 class="home-heading">Good ${dayPart()}</h1>
      <div class="home-sub">Jump back into your workspace.</div>
      <div class="home-grid">
        ${recent.map(p => `<div class="home-card" data-home-page="${p.id}"><div class="home-card-icon">${pageIconMarkup(p.icon)}</div><div class="home-card-title">${escapeHtml(p.title||'Untitled')}</div><div class="home-card-sub">${countWords(p)} words · ${p.blocks.length} blocks</div></div>`).join('')}
        <div class="home-card" data-home-action="new"><div class="home-card-icon">＋</div><div class="home-card-title">New page</div><div class="home-card-sub">Start from a blank page</div></div>
      </div>
    </div>`;
  }

  function renderPage(){
    const page = currentPage();
    if (!page) return;
    els.homeView.classList.add('hidden');
    els.editorView.classList.remove('hidden');
    renderBreadcrumbs(page);
    els.pageTitle.textContent = page.title || '';
    els.pageIcon.innerHTML = page.icon ? pageIconMarkup(page.icon,'') : '';
    els.pageIcon.classList.toggle('hidden', !page.icon);
    els.addIconBtn.textContent = page.icon ? 'Change icon' : 'Add icon';
    const commentCount=(page.comments||[]).length;
    els.addCommentBtn.textContent = commentCount ? `Comments ${commentCount}` : 'Add comment';
    els.pageComments.classList.add('hidden');
    els.favoriteBtn.textContent = page.favorite ? '★' : '☆';
    els.favoriteBtn.title = page.favorite ? 'Remove from favorites' : 'Add to favorites';
    renderBlocks(page);
  }

  function renderBreadcrumbs(page){
    const chain=[]; let cur=page;
    while(cur){ chain.unshift(cur); cur=cur.parentId?pageById(cur.parentId):null; }
    els.breadcrumbs.innerHTML = chain.map((p,i) => `<span class="crumb" data-crumb-id="${p.id}"><span class="crumb-icon">${pageIconMarkup(p.icon)}</span>${escapeHtml(p.title||'Untitled')}</span>${i<chain.length-1?'<span class="crumb-sep">/</span>':''}`).join('');
  }

  function renderBlocks(page){
    if (!page.blocks.length) page.blocks.push(newTextBlock());
    els.blockEditor.innerHTML = page.blocks.map((b,i) => blockHTML(b,i,page.blocks)).join('');
    els.emptyHint.style.display = 'none';
    scheduleMermaidPreviews();
    if(page.id===state.currentPageId) renderRightSidebar();
  }

  function blockHTML(block, index, blocks){
    if (block.type === 'database') return databaseHTML(block);
    const placeholder = "Type '/' for commands";
    const emptyState = block.text ? 'false' : 'true';
    const gutter = `<div class="block-gutter"><button data-block-action="add" title="Add block">＋</button><button draggable="true" data-block-action="drag" title="Drag / options" aria-label="Drag / options"><svg class="block-drag-icon" viewBox="0 0 12 22" aria-hidden="true" focusable="false"><circle cx="3.5" cy="3.5"/><circle cx="8.5" cy="3.5"/><circle cx="3.5" cy="11"/><circle cx="8.5" cy="11"/><circle cx="3.5" cy="18.5"/><circle cx="8.5" cy="18.5"/></svg></button></div>`;
    if (block.type === 'page') return pageBlockHTML(block, gutter);
    if (block.type === 'link') return hyperlinkHTML(block, gutter);
    if (block.type === 'image') return imageHTML(block, gutter);
    if (block.type === 'code') return codeBlockHTML(block, gutter);
    if (block.type === 'table') return simpleTableHTML(block, gutter);
    if (block.type === 'columns') return columnsHTML(block, gutter);
    if (block.type === 'divider') return `<div class="block-row" data-block-id="${block.id}" data-type="divider" draggable="false">${gutter}<div class="divider-line"></div></div>`;
    if (block.type === 'todo') return `<div class="block-row ${block.checked?'checked':''}" data-block-id="${block.id}" data-type="todo">${gutter}<input class="todo-box" type="checkbox" ${block.checked?'checked':''}><div class="block-content" contenteditable="true" data-placeholder="${placeholder}" data-empty="${emptyState}">${inlineTextHTML(block)}</div></div>`;
    if (block.type === 'bullet') { const indent=listIndentLevel(block), marker=['•','◦','▪'][indent%3], offset=indent*24; return `<div class="block-row" data-block-id="${block.id}" data-type="bullet" data-list-indent="${indent}" style="--list-indent-offset:${offset}px">${gutter}<div class="list-prefix">${marker}</div><div class="block-content" contenteditable="true" data-placeholder="${placeholder}" data-empty="${emptyState}">${inlineTextHTML(block)}</div></div>`; }
    if (block.type === 'number') { const indent=listIndentLevel(block), offset=indent*24; return `<div class="block-row" data-block-id="${block.id}" data-type="number" data-list-indent="${indent}" style="--list-indent-offset:${offset}px">${gutter}<div class="list-prefix">${numberForBlock(block.id, blocks)}.</div><div class="block-content" contenteditable="true" data-placeholder="${placeholder}" data-empty="${emptyState}">${inlineTextHTML(block)}</div></div>`; }
    if (block.type === 'toggle') return `<div class="block-row" data-block-id="${block.id}" data-type="toggle">${gutter}<div class="toggle-prefix" aria-label="${block.open?'Collapse':'Expand'}">${chevronSvg(block.open?'down':'right','toggle-chevron')}</div><div class="block-content" contenteditable="true" data-placeholder="${placeholder}" data-empty="${emptyState}">${inlineTextHTML(block)}</div></div>`;
    return `<div class="block-row" data-block-id="${block.id}" data-type="${block.type}">${gutter}<div class="block-content" contenteditable="true" spellcheck="true" data-placeholder="${placeholder}" data-empty="${emptyState}">${inlineTextHTML(block)}</div></div>`;
  }

  function normalizeHyperlinkUrl(value){
    let raw=String(value||'').trim();
    if(!raw) return '';
    if(/^\/\//.test(raw)) raw='https:'+raw;
    else if(!/^[a-z][a-z0-9+.-]*:/i.test(raw)) raw='https://'+raw;
    try{
      const url=new URL(raw);
      if(!['http:','https:','mailto:','tel:'].includes(url.protocol)) return '';
      return url.href;
    }catch{ return ''; }
  }

  function normalizeInlineLinkRanges(links,textLength){
    const max=Math.max(0,Number(textLength)||0), out=[];
    const source=Array.isArray(links)?links:[];
    for(const item of source){
      const url=normalizeHyperlinkUrl(item?.url); if(!url) continue;
      const start=Math.max(0,Math.min(max,Number(item?.start)||0));
      const end=Math.max(start,Math.min(max,Number(item?.end)||0));
      if(end<=start) continue;
      out.push({start,end,url});
    }
    out.sort((a,b)=>a.start-b.start || a.end-b.end);
    const clean=[];
    for(const item of out){
      const prev=clean.at(-1);
      if(prev && item.start<prev.end) continue;
      if(prev && item.start===prev.end && item.url===prev.url){ prev.end=item.end; continue; }
      clean.push(item);
    }
    return clean;
  }

  function inlineLinksForBlock(block){
    const text=String(block?.text||'');
    const links=normalizeInlineLinkRanges(block?.inlineLinks,text.length);
    if(block){ if(links.length) block.inlineLinks=links; else delete block.inlineLinks; }
    return links;
  }

  function inlineTextHTML(block){
    const text=String(block?.text||''), links=inlineLinksForBlock(block);
    if(!links.length) return escapeHtml(text);
    let html='', cursor=0;
    for(const link of links){
      html+=escapeHtml(text.slice(cursor,link.start));
      const label=text.slice(link.start,link.end);
      html+=`<a class="inline-link" data-inline-link href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" title="Ctrl/Cmd + click to open">${escapeHtml(label)}</a>`;
      cursor=link.end;
    }
    return html+escapeHtml(text.slice(cursor));
  }

  function inlineLinksFromContent(content,text){
    const links=[];
    for(const anchor of content?.querySelectorAll?.('a[data-inline-link]')||[]){
      const href=normalizeHyperlinkUrl(anchor.getAttribute('href')||''); if(!href) continue;
      try{
        const before=document.createRange(); before.selectNodeContents(content); before.setEndBefore(anchor);
        const start=before.toString().length, end=start+(anchor.innerText||anchor.textContent||'').length;
        if(end>start) links.push({start,end,url:href});
      }catch{}
    }
    return normalizeInlineLinkRanges(links,String(text||'').length);
  }

  function splitInlineLinksAt(block,offset){
    const links=inlineLinksForBlock(block), point=Math.max(0,Number(offset)||0), left=[], right=[];
    for(const link of links){
      if(link.end<=point) left.push({...link});
      else if(link.start>=point) right.push({start:link.start-point,end:link.end-point,url:link.url});
      else {
        if(link.start<point) left.push({start:link.start,end:point,url:link.url});
        if(link.end>point) right.push({start:0,end:link.end-point,url:link.url});
      }
    }
    return {left,right};
  }

  function inlineLinksAroundRange(block,start,end){
    const links=inlineLinksForBlock(block), left=[], right=[];
    for(const link of links){
      if(link.end<=start) left.push({...link});
      else if(link.start<start) left.push({start:link.start,end:start,url:link.url});
      if(link.start>=end) right.push({start:link.start-end,end:link.end-end,url:link.url});
      else if(link.end>end) right.push({start:0,end:link.end-end,url:link.url});
    }
    return {left:normalizeInlineLinkRanges(left,start),right};
  }

  function replaceBlockRangeWithInlineLink(block,start,end,label,url){
    const original=String(block?.text||''), safeStart=Math.max(0,Math.min(original.length,start)), safeEnd=Math.max(safeStart,Math.min(original.length,end));
    const inserted=String(label||''), delta=inserted.length-(safeEnd-safeStart), adjusted=[];
    for(const link of inlineLinksForBlock(block)){
      if(link.end<=safeStart) adjusted.push({...link});
      else if(link.start>=safeEnd) adjusted.push({start:link.start+delta,end:link.end+delta,url:link.url});
      else {
        if(link.start<safeStart) adjusted.push({start:link.start,end:safeStart,url:link.url});
        if(link.end>safeEnd){ const tailStart=safeStart+inserted.length; adjusted.push({start:tailStart,end:link.end+delta,url:link.url}); }
      }
    }
    block.text=original.slice(0,safeStart)+inserted+original.slice(safeEnd);
    if(inserted.length) adjusted.push({start:safeStart,end:safeStart+inserted.length,url});
    block.inlineLinks=normalizeInlineLinkRanges(adjusted,block.text.length);
    if(!block.inlineLinks.length) delete block.inlineLinks;
    return safeStart+inserted.length;
  }

  function applyInlineLinkToSelection(block,start,end,url){
    if(end<=start) return false;
    const kept=inlineLinksForBlock(block).filter(link=>link.end<=start || link.start>=end);
    kept.push({start,end,url});
    block.inlineLinks=normalizeInlineLinkRanges(kept,String(block.text||'').length);
    return true;
  }

  function normalizePastedLinkUrl(value){
    const raw=String(value||'').trim(); if(!raw || /\s/.test(raw)) return '';
    if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) return `mailto:${raw}`;
    if(/^(?:https?:\/\/|mailto:|tel:|\/\/)/i.test(raw)) return normalizeHyperlinkUrl(raw);
    if(/^www\./i.test(raw) || /^localhost(?::\d+)?(?:[/?#].*)?$/i.test(raw) || /^(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d+)?(?:[/?#].*)?$/i.test(raw)) return normalizeHyperlinkUrl(raw);
    return '';
  }

  function clipboardLinkPayload(data){
    const html=String(data?.getData?.('text/html')||'');
    if(html){
      try{
        const doc=new DOMParser().parseFromString(html,'text/html');
        const anchors=[...doc.body.querySelectorAll('a[href]')];
        const visible=(doc.body.innerText||doc.body.textContent||'').trim();
        if(anchors.length===1){
          const anchor=anchors[0], label=(anchor.innerText||anchor.textContent||'').trim();
          const url=normalizePastedLinkUrl(anchor.getAttribute('href')||'') || normalizeHyperlinkUrl(anchor.getAttribute('href')||'');
          if(url && label && (!visible || visible===label)) return {url,label};
        }
      }catch{}
    }
    const plain=String(data?.getData?.('text/plain')||'').trim();
    const url=normalizePastedLinkUrl(plain);
    return url?{url,label:plain}:null;
  }

  function pasteLinkIntoBlock(content,payload){
    const row=content?.closest('.block-row'), location=findBlockLocation(row?.dataset.blockId), page=currentPage();
    if(!location || !page || !isTextLikeBlock(location.block) || !payload?.url) return false;
    const block=location.block, {start,end}=selectionOffsetsWithin(content);
    let caret=end;
    if(end>start){
      if(!applyInlineLinkToSelection(block,start,end,payload.url)) return false;
      caret=end;
    }else{
      caret=replaceBlockRangeWithInlineLink(block,start,end,payload.label||payload.url,payload.url);
    }
    scheduleSave(); hideFloatingMenus(); renderBlocks(page); focusBlock(block.id,caret);
    toast(end>start?'Linked selected text':'Link pasted');
    return true;
  }

  function hyperlinkHTML(block,gutter){
    if(typeof block.text!=='string') block.text='';
    if(typeof block.url!=='string') block.url='';
    const href=normalizeHyperlinkUrl(block.url);
    return `<div class="block-row hyperlink-block" data-block-id="${block.id}" data-type="link">${gutter}<div class="hyperlink-shell"><span class="hyperlink-icon">🔗</span><div class="hyperlink-fields"><div class="hyperlink-label" contenteditable="true" spellcheck="true" data-link-label data-placeholder="Link title">${escapeHtml(block.text||'')}</div><input class="hyperlink-url" data-link-url type="text" inputmode="url" autocomplete="url" spellcheck="false" placeholder="https://example.com" value="${escapeHtml(block.url||'')}"></div><a class="hyperlink-open ${href?'':'disabled'}" data-link-open ${href?`href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer"`:''} title="Open link" aria-label="Open link">↗</a></div></div>`;
  }

  function updateHyperlinkOpen(row,block){
    const anchor=row?.querySelector('[data-link-open]'); if(!anchor)return;
    const href=normalizeHyperlinkUrl(block?.url);
    anchor.classList.toggle('disabled',!href);
    if(href){ anchor.href=href; anchor.target='_blank'; anchor.rel='noopener noreferrer'; }
    else { anchor.removeAttribute('href'); anchor.removeAttribute('target'); anchor.removeAttribute('rel'); }
  }

  function focusHyperlinkBlock(id,field='url'){
    requestAnimationFrame(()=>{
      const row=document.querySelector(`.hyperlink-block[data-block-id="${id}"]`);
      const target=field==='label'?row?.querySelector('[data-link-label]'):row?.querySelector('[data-link-url]');
      target?.focus(); if(target?.select) target.select(); else if(target) selectAllContent(target);
    });
  }

  function normalizeSimpleTableBlock(block){
    let rows=Array.isArray(block.tableRows)?block.tableRows:null;
    if(!rows?.length) rows=Array.from({length:3},()=>Array(3).fill(''));
    const cols=Math.max(1,...rows.map(r=>Array.isArray(r)?r.length:0));
    block.tableRows=rows.map(r=>{ const row=Array.isArray(r)?r.map(v=>String(v??'')):[]; while(row.length<cols)row.push(''); return row.slice(0,cols); });
    if(typeof block.tableHeaderRow!=='boolean') block.tableHeaderRow=false;
    if(typeof block.tableHeaderColumn!=='boolean') block.tableHeaderColumn=false;
    return block;
  }

  function tableAxisHandleSvg(){
    return `<svg class="table-axis-handle-icon" viewBox="0 0 12 18" aria-hidden="true" focusable="false"><circle cx="3.5" cy="3" r="1.25"></circle><circle cx="8.5" cy="3" r="1.25"></circle><circle cx="3.5" cy="9" r="1.25"></circle><circle cx="8.5" cy="9" r="1.25"></circle><circle cx="3.5" cy="15" r="1.25"></circle><circle cx="8.5" cy="15" r="1.25"></circle></svg>`;
  }

  function tableSelectAllSvg(){
    return `<svg class="table-select-all-icon" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><rect x="1" y="1" width="4" height="4" rx=".7"></rect><rect x="7" y="1" width="4" height="4" rx=".7"></rect><rect x="1" y="7" width="4" height="4" rx=".7"></rect><rect x="7" y="7" width="4" height="4" rx=".7"></rect></svg>`;
  }

  function tableCellSelectionBounds(selection=tableCellSelection){
    if(!selection?.start || !selection?.end) return null;
    return {
      top:Math.min(selection.start.row,selection.end.row),
      bottom:Math.max(selection.start.row,selection.end.row),
      left:Math.min(selection.start.col,selection.end.col),
      right:Math.max(selection.start.col,selection.end.col)
    };
  }

  function isTableCellInSelection(blockId,row,col){
    if(!tableCellSelection?.active || tableCellSelection.blockId!==blockId) return false;
    const bounds=tableCellSelectionBounds();
    return !!bounds && row>=bounds.top && row<=bounds.bottom && col>=bounds.left && col<=bounds.right;
  }

  function simpleTableHTML(block,gutter){
    normalizeSimpleTableBlock(block);
    const rows=block.tableRows, colCount=rows[0]?.length||1, selected=selectedTableBlockId===block.id;
    const columnControls=Array.from({length:colCount},(_,ci)=>`<th class="simple-table-col-control" scope="col" data-table-col-control="${ci}"><button type="button" class="table-axis-handle table-col-handle" draggable="true" data-table-col-menu="${ci}" title="Drag to reorder · click for column options" aria-label="Column ${ci+1}: drag to reorder or click for options">${tableAxisHandleSvg()}</button></th>`).join('');
    const body=rows.map((row,ri)=>`<tr data-table-row="${ri}"><td class="simple-table-row-control"><button type="button" class="table-axis-handle table-row-handle" draggable="true" data-table-row-menu="${ri}" title="Drag to reorder · click for row options" aria-label="Row ${ri+1}: drag to reorder or click for options">${tableAxisHandleSvg()}</button></td>${row.map((cell,ci)=>{
      const header=(block.tableHeaderRow&&ri===0)||(block.tableHeaderColumn&&ci===0);
      const tag=header?'th':'td';
      const rangeSelected=isTableCellInSelection(block.id,ri,ci), rangeAnchor=rangeSelected && tableCellSelection?.start?.row===ri && tableCellSelection?.start?.col===ci;
      return `<${tag} data-table-column="${ci}"><div class="simple-table-cell${rangeSelected?' cell-range-selected':''}${rangeAnchor?' cell-range-anchor':''}" contenteditable="true" spellcheck="true" data-table-cell="${ri}:${ci}">${escapeHtml(cell)}</div></${tag}>`;
    }).join('')}</tr>`).join('');
    return `<div class="block-row simple-table-block${selected?' table-selected':''}" data-block-id="${block.id}" data-type="table">${gutter}<div class="simple-table-shell"><div class="simple-table-scroll"><table class="simple-table"><colgroup><col class="simple-table-control-col">${Array.from({length:colCount},()=>'<col>').join('')}</colgroup><thead class="simple-table-controls-head"><tr><th class="simple-table-corner-control"><button type="button" class="simple-table-select-all" data-table-select title="Select table" aria-label="Select entire table" aria-pressed="${selected?'true':'false'}">${tableSelectAllSvg()}</button></th>${columnControls}</tr></thead><tbody>${body}</tbody></table><button type="button" class="simple-table-add-column" data-table-add-col title="Add column" aria-label="Add column">＋</button></div><button type="button" class="simple-table-add-row" data-table-add-row title="Add row" aria-label="Add row">＋</button></div></div>`;
  }

  function tableCellCoordinates(cell){
    if(!cell?.matches?.('[data-table-cell]')) return null;
    const [row,col]=String(cell.dataset.tableCell||'').split(':').map(Number);
    return Number.isInteger(row)&&Number.isInteger(col)?{row,col}:null;
  }

  function clearTableCellSelection(){
    if(tableCellSelection?.dragging){
      window.removeEventListener('mousemove',onTableCellSelectionMove,true);
      window.removeEventListener('mouseup',onTableCellSelectionEnd,true);
    }
    tableCellSelection=null;
    document.body.classList.remove('table-cell-selecting');
    document.querySelectorAll('.simple-table-cell.cell-range-selected,.simple-table-cell.cell-range-anchor').forEach(cell=>cell.classList.remove('cell-range-selected','cell-range-anchor'));
  }

  function renderTableCellSelection(){
    document.querySelectorAll('.simple-table-cell.cell-range-selected,.simple-table-cell.cell-range-anchor').forEach(cell=>cell.classList.remove('cell-range-selected','cell-range-anchor'));
    const selection=tableCellSelection;
    if(!selection?.active) return;
    const bounds=tableCellSelectionBounds(selection); if(!bounds) return;
    const row=document.querySelector(`.simple-table-block[data-block-id="${selection.blockId}"]`); if(!row) return;
    row.querySelectorAll('[data-table-cell]').forEach(cell=>{
      const point=tableCellCoordinates(cell); if(!point) return;
      if(point.row>=bounds.top&&point.row<=bounds.bottom&&point.col>=bounds.left&&point.col<=bounds.right){
        cell.classList.add('cell-range-selected');
        if(point.row===selection.start.row&&point.col===selection.start.col) cell.classList.add('cell-range-anchor');
      }
    });
  }

  function beginTableCellSelection(e,cell){
    const row=cell?.closest?.('.simple-table-block'), blockId=row?.dataset.blockId, start=tableCellCoordinates(cell);
    if(!blockId || !start) return false;
    clearTableCellSelection();
    clearSelectedTable();
    clearMultiBlockSelection();
    tableCellSelection={blockId,start,end:start,active:false,dragging:true,startX:e.clientX,startY:e.clientY};
    window.addEventListener('mousemove',onTableCellSelectionMove,true);
    window.addEventListener('mouseup',onTableCellSelectionEnd,true);
    return true;
  }

  function onTableCellSelectionMove(e){
    const selection=tableCellSelection; if(!selection?.dragging) return;
    if(!(e.buttons&1)){ onTableCellSelectionEnd(e); return; }
    const cell=document.elementFromPoint(e.clientX,e.clientY)?.closest?.('[data-table-cell]');
    if(!cell || cell.closest('.simple-table-block')?.dataset.blockId!==selection.blockId) return;
    const end=tableCellCoordinates(cell); if(!end) return;
    const crossed=end.row!==selection.start.row || end.col!==selection.start.col;
    const moved=Math.hypot(e.clientX-selection.startX,e.clientY-selection.startY)>4;
    if(!selection.active && !(crossed&&moved)) return;
    selection.active=true; selection.end=end;
    document.body.classList.add('table-cell-selecting');
    e.preventDefault();
    try{ window.getSelection()?.removeAllRanges(); }catch{}
    renderTableCellSelection();
  }

  function onTableCellSelectionEnd(e){
    const selection=tableCellSelection; if(!selection) return;
    window.removeEventListener('mousemove',onTableCellSelectionMove,true);
    window.removeEventListener('mouseup',onTableCellSelectionEnd,true);
    selection.dragging=false;
    document.body.classList.remove('table-cell-selecting');
    if(!selection.active){ tableCellSelection=null; return; }
    const cell=document.elementFromPoint(e.clientX,e.clientY)?.closest?.('[data-table-cell]');
    if(cell && cell.closest('.simple-table-block')?.dataset.blockId===selection.blockId){
      const end=tableCellCoordinates(cell); if(end) selection.end=end;
    }
    e.preventDefault?.();
    try{ window.getSelection()?.removeAllRanges(); }catch{}
    renderTableCellSelection();
  }

  function selectedTableCellMatrix(){
    const selection=tableCellSelection; if(!selection?.active) return null;
    const block=findBlock(selection.blockId); if(block?.type!=='table') return null;
    normalizeSimpleTableBlock(block);
    const bounds=tableCellSelectionBounds(selection); if(!bounds) return null;
    const rows=[];
    for(let r=bounds.top;r<=Math.min(bounds.bottom,block.tableRows.length-1);r++) rows.push(block.tableRows[r].slice(bounds.left,bounds.right+1));
    return {block,bounds,rows};
  }

  function tableMatrixMarkdown(rows){
    if(!rows?.length) return '';
    const cols=Math.max(1,...rows.map(row=>row.length));
    const line=row=>`| ${Array.from({length:cols},(_,i)=>markdownTableCell(row?.[i]??'')).join(' | ')} |`;
    return [line(rows[0]),`| ${Array(cols).fill('---').join(' | ')} |`,...rows.slice(1).map(line)].join('\n');
  }

  function tableMatrixTsv(rows){
    const encode=value=>{ const text=String(value??''); return /[\t\r\n"]/.test(text)?`"${text.replace(/"/g,'""')}"`:text; };
    return rows.map(row=>row.map(encode).join('\t')).join('\n');
  }

  function tableMatrixHtml(rows){
    return `<table>${rows.map(row=>`<tr>${row.map(cell=>`<td>${escapeHtml(cell).replace(/\n/g,'<br>')}</td>`).join('')}</tr>`).join('')}</table>`;
  }

  function copySelectedTableCellsToClipboard(e){
    const selected=selectedTableCellMatrix(); if(!selected?.rows?.length) return false;
    const markdown=tableMatrixMarkdown(selected.rows), tsv=tableMatrixTsv(selected.rows);
    e?.preventDefault?.();
    e?.clipboardData?.setData?.('text/plain',tsv);
    e?.clipboardData?.setData?.('text/markdown',markdown);
    e?.clipboardData?.setData?.('text/html',tableMatrixHtml(selected.rows));
    return true;
  }

  function htmlTableCellText(cell){
    const clone=cell.cloneNode(true);
    clone.querySelectorAll('br').forEach(br=>br.replaceWith('\n'));
    return String(clone.textContent||'').replace(/\r\n?/g,'\n');
  }

  function tableMatrixFromHtml(html){
    const source=String(html||''); if(!/<table[\s>]/i.test(source)) return null;
    try{
      const doc=new DOMParser().parseFromString(source,'text/html'), table=doc.querySelector('table');
      if(!table) return null;
      const rows=[...table.querySelectorAll('tr')].map(row=>[...row.children].filter(cell=>/^(TD|TH)$/.test(cell.tagName)).map(htmlTableCellText)).filter(row=>row.length);
      if(!rows.length) return null;
      const cols=Math.max(...rows.map(row=>row.length));
      return rows.map(row=>Array.from({length:cols},(_,i)=>String(row[i]??'')));
    }catch{return null;}
  }

  function tableMatrixFromTsv(text){
    const source=String(text??'').replace(/\r\n?/g,'\n');
    if(!source || (!source.includes('\t') && !source.includes('\n'))) return null;
    const rows=[], row=[]; let cell='', quoted=false;
    for(let i=0;i<source.length;i++){
      const ch=source[i];
      if(quoted){
        if(ch==='"'){
          if(source[i+1]==='"'){ cell+='"'; i++; }
          else quoted=false;
        }else cell+=ch;
        continue;
      }
      if(ch==='"' && cell===''){ quoted=true; continue; }
      if(ch==='\t'){ row.push(cell); cell=''; continue; }
      if(ch==='\n'){ row.push(cell); rows.push(row.splice(0)); cell=''; continue; }
      cell+=ch;
    }
    row.push(cell); rows.push(row);
    if(rows.length>1 && rows.at(-1)?.length===1 && rows.at(-1)[0]==='' && source.endsWith('\n')) rows.pop();
    if(!rows.length) return null;
    const cols=Math.max(...rows.map(r=>r.length));
    if(cols<=1 && rows.length<=1) return null;
    return rows.map(r=>Array.from({length:cols},(_,i)=>String(r[i]??'')));
  }

  function clipboardTableMatrix(data){
    const htmlMatrix=tableMatrixFromHtml(data?.getData?.('text/html'));
    if(htmlMatrix?.length) return htmlMatrix;
    return tableMatrixFromTsv(data?.getData?.('text/plain'));
  }

  function pasteTableMatrixIntoCell(cell,data){
    const point=tableCellCoordinates(cell), row=cell?.closest?.('.simple-table-block'), block=findBlock(row?.dataset.blockId);
    if(!point || block?.type!=='table') return false;
    const matrix=clipboardTableMatrix(data); if(!matrix?.length) return false;
    const width=Math.max(1,...matrix.map(r=>r.length));
    const normalized=matrix.map(r=>Array.from({length:width},(_,i)=>String(r[i]??'')));
    normalizeSimpleTableBlock(block);
    const currentCols=block.tableRows[0]?.length||1;
    const requiredCols=Math.max(currentCols,point.col+width), requiredRows=point.row+normalized.length;
    if(requiredCols>currentCols) block.tableRows.forEach(r=>{ while(r.length<requiredCols) r.push(''); });
    while(block.tableRows.length<requiredRows) block.tableRows.push(Array(requiredCols).fill(''));
    block.tableRows.forEach(r=>{ while(r.length<requiredCols) r.push(''); });
    normalized.forEach((sourceRow,ri)=>sourceRow.forEach((value,ci)=>{ block.tableRows[point.row+ri][point.col+ci]=value; }));

    clearSelectedTable(); clearMultiBlockSelection(); clearTableCellSelection();
    tableCellSelection={
      blockId:block.id,
      start:{row:point.row,col:point.col},
      end:{row:point.row+normalized.length-1,col:point.col+width-1},
      active:true,
      dragging:false,
      startX:0,
      startY:0
    };
    scheduleSave(); renderBlocks(currentPage());
    requestAnimationFrame(()=>{
      const target=document.querySelector(`.simple-table-block[data-block-id="${block.id}"] [data-table-cell="${point.row}:${point.col}"]`);
      target?.focus();
      try{ window.getSelection()?.removeAllRanges(); }catch{}
      renderTableCellSelection();
    });
    return true;
  }

  function clearSelectedTableCells(){
    const selected=selectedTableCellMatrix(); if(!selected) return false;
    for(let r=selected.bounds.top;r<=selected.bounds.bottom;r++){
      for(let c=selected.bounds.left;c<=selected.bounds.right;c++) if(selected.block.tableRows[r] && c<selected.block.tableRows[r].length) selected.block.tableRows[r][c]='';
    }
    const id=selected.block.id, focus={...tableCellSelection.start};
    clearTableCellSelection();
    scheduleSave(); renderBlocks(currentPage()); focusSimpleTableCell(id,focus.row,focus.col);
    return true;
  }

  function clearSelectedTable(){
    if(!selectedTableBlockId) return;
    const row=document.querySelector(`.simple-table-block[data-block-id="${selectedTableBlockId}"]`);
    row?.classList.remove('table-selected');
    row?.querySelector('[data-table-select]')?.setAttribute('aria-pressed','false');
    selectedTableBlockId=null;
  }

  function selectSimpleTable(id){
    const block=findBlock(id); if(block?.type!=='table') return false;
    clearTableCellSelection();
    clearMultiBlockSelection();
    clearSelectedTable();
    selectedTableBlockId=id;
    try{ window.getSelection()?.removeAllRanges(); }catch{}
    const row=document.querySelector(`.simple-table-block[data-block-id="${id}"]`);
    row?.classList.add('table-selected');
    const button=row?.querySelector('[data-table-select]');
    button?.setAttribute('aria-pressed','true');
    button?.focus({preventScroll:true});
    return true;
  }

  function markdownTableCell(value){
    return String(value??'').replace(/\\/g,'\\\\').replace(/\|/g,'\\|').replace(/\r?\n/g,'<br>');
  }

  function simpleTableMarkdown(block){
    normalizeSimpleTableBlock(block);
    const rows=block.tableRows, cols=rows[0]?.length||1;
    const line=row=>`| ${Array.from({length:cols},(_,i)=>markdownTableCell(row?.[i]??'')).join(' | ')} |`;
    const header=rows[0]||Array(cols).fill('');
    return [line(header),`| ${Array(cols).fill('---').join(' | ')} |`,...rows.slice(1).map(line)].join('\n');
  }

  function simpleTableClipboardHtml(block){
    normalizeSimpleTableBlock(block);
    const rows=block.tableRows;
    return `<table>${rows.map((row,ri)=>`<tr>${row.map((cell,ci)=>{ const tag=(block.tableHeaderRow&&ri===0)||(block.tableHeaderColumn&&ci===0)?'th':'td'; return `<${tag}>${escapeHtml(cell).replace(/\n/g,'<br>')}</${tag}>`; }).join('')}</tr>`).join('')}</table>`;
  }

  function copySelectedTableToClipboard(e){
    if(!selectedTableBlockId) return false;
    const block=findBlock(selectedTableBlockId);
    if(block?.type!=='table'){ clearSelectedTable(); return false; }
    const markdown=simpleTableMarkdown(block);
    e?.preventDefault?.();
    e?.clipboardData?.setData?.('text/plain',markdown);
    e?.clipboardData?.setData?.('text/markdown',markdown);
    e?.clipboardData?.setData?.('text/html',simpleTableClipboardHtml(block));
    return true;
  }

  function focusSimpleTableCell(id,rowIndex,colIndex){
    requestAnimationFrame(()=>document.querySelector(`.simple-table-block[data-block-id="${id}"] [data-table-cell="${rowIndex}:${colIndex}"]`)?.focus());
  }

  function mutateSimpleTableAxis(block,axis,action,index){
    normalizeSimpleTableBlock(block);
    const rows=block.tableRows, rowCount=rows.length, colCount=rows[0]?.length||1;
    if(axis==='row'){
      const at=Math.max(0,Math.min(rowCount-1,Number(index)||0));
      if(action==='insert-before'){ rows.splice(at,0,Array(colCount).fill('')); return {row:at,col:0}; }
      if(action==='insert-after'){ rows.splice(at+1,0,Array(colCount).fill('')); return {row:at+1,col:0}; }
      if(action==='duplicate'){ rows.splice(at+1,0,[...rows[at]]); return {row:at+1,col:0}; }
      if(action==='delete' && rowCount>1){ rows.splice(at,1); return {row:Math.min(at,rows.length-1),col:0}; }
      return null;
    }
    const at=Math.max(0,Math.min(colCount-1,Number(index)||0));
    if(action==='insert-before'){
      rows.forEach(row=>row.splice(at,0,''));
      return {row:0,col:at};
    }
    if(action==='insert-after'){
      rows.forEach(row=>row.splice(at+1,0,''));
      return {row:0,col:at+1};
    }
    if(action==='duplicate'){
      rows.forEach(row=>row.splice(at+1,0,row[at]??''));
      return {row:0,col:at+1};
    }
    if(action==='delete' && colCount>1){
      rows.forEach(row=>row.splice(at,1));
      return {row:0,col:Math.min(at,(rows[0]?.length||1)-1)};
    }
    return null;
  }

  function showSimpleTableAxisMenu(anchor,id,axis,index){
    const block=findBlock(id); if(block?.type!=='table') return;
    normalizeSimpleTableBlock(block);
    const isRow=axis==='row', count=isRow?block.tableRows.length:(block.tableRows[0]?.length||1);
    const r=anchor.getBoundingClientRect(), menuWidth=190, menuHeight=176;
    els.blockMenu.style.width=`${menuWidth}px`;
    els.blockMenu.style.left=`${Math.max(8,Math.min(r.left,window.innerWidth-menuWidth-8))}px`;
    els.blockMenu.style.top=`${Math.max(8,Math.min(r.bottom+4,window.innerHeight-menuHeight-8))}px`;
    const before=isRow?'Insert row above':'Insert column left';
    const after=isRow?'Insert row below':'Insert column right';
    const duplicate=isRow?'Duplicate row':'Duplicate column';
    const remove=isRow?'Delete row':'Delete column';
    els.blockMenu.innerHTML=`
      <div class="table-menu-section">
        <div class="table-menu-label">${isRow?`Row ${Number(index)+1}`:`Column ${Number(index)+1}`}</div>
        <button class="block-menu-item" data-table-axis-action="insert-before" data-table-axis="${axis}" data-table-axis-index="${index}" data-block-id="${id}">＋ ${before}</button>
        <button class="block-menu-item" data-table-axis-action="insert-after" data-table-axis="${axis}" data-table-axis-index="${index}" data-block-id="${id}">＋ ${after}</button>
        <button class="block-menu-item" data-table-axis-action="duplicate" data-table-axis="${axis}" data-table-axis-index="${index}" data-block-id="${id}">Duplicate ${isRow?'row':'column'}</button>
      </div>
      <div class="table-menu-section">
        <button class="block-menu-item danger" data-table-axis-action="delete" data-table-axis="${axis}" data-table-axis-index="${index}" data-block-id="${id}" ${count<=1?'disabled':''}>${remove}</button>
      </div>`;
    els.blockMenu.classList.remove('hidden');
  }

  function runSimpleTableAxisAction(button){
    const id=button.dataset.blockId, axis=button.dataset.tableAxis, action=button.dataset.tableAxisAction, index=Number(button.dataset.tableAxisIndex);
    const block=findBlock(id); if(block?.type!=='table') return;
    const target=mutateSimpleTableAxis(block,axis,action,index);
    if(!target) return;
    scheduleSave(); hideFloatingMenus(); renderBlocks(currentPage()); focusSimpleTableCell(id,target.row,target.col);
  }

  function normalizeColumnsBlock(block){
    if(!Array.isArray(block.columns) || !block.columns.length || typeof block.columns[0]==='string'){
      block.columns=Array.from({length:2},()=>({id:uid('col'),blocks:[newTextBlock()]}));
    }
    block.columns=block.columns.slice(0,4).map(col=>{
      const normalized={id:col?.id||uid('col'),blocks:normalizeBlockTree(col?.blocks)};
      if(!normalized.blocks.length) normalized.blocks=[newTextBlock()];
      return normalized;
    });
    while(block.columns.length<2) block.columns.push({id:uid('col'),blocks:[newTextBlock()]});
    return block;
  }

  function columnsHTML(block,gutter){
    normalizeColumnsBlock(block);
    const count=block.columns.length;
    const panes=block.columns.map((col,ci)=>`<div class="column-pane" data-column-id="${col.id}" data-column-index="${ci}">${col.blocks.map((child,i)=>blockHTML(child,i,col.blocks)).join('')}</div>`).join('');
    return `<div class="block-row columns-block" data-block-id="${block.id}" data-type="columns">${gutter}<div class="columns-shell"><div class="columns-toolbar"><label>Columns <select data-columns-count aria-label="Column count">${[2,3,4].map(n=>`<option value="${n}" ${n===count?'selected':''}>${n}</option>`).join('')}</select></label></div><div class="columns-grid" style="--column-count:${count}">${panes}</div></div></div>`;
  }

  function setColumnsCount(block,count){
    normalizeColumnsBlock(block); count=Math.max(2,Math.min(4,Number(count)||2));
    if(count>block.columns.length){ while(block.columns.length<count) block.columns.push({id:uid('col'),blocks:[newTextBlock()]}); return; }
    if(count<block.columns.length){
      const keep=block.columns.slice(0,count), removed=block.columns.slice(count);
      const target=keep[keep.length-1];
      const moved=removed.flatMap(col=>col.blocks||[]);
      const targetOnlyEmpty=target.blocks.length===1 && target.blocks[0].type==='text' && !(target.blocks[0].text||'');
      if(targetOnlyEmpty && moved.length) target.blocks.length=0;
      target.blocks.push(...moved);
      if(!target.blocks.length) target.blocks.push(newTextBlock());
      block.columns=keep;
    }
  }

  function normalizeBlockTree(blocks){
    if(!Array.isArray(blocks)) return [];
    for(const block of blocks){
      if(!block || typeof block!=='object') continue;
      if(!block.id) block.id=uid('b');
      if(block.type==='table') normalizeSimpleTableBlock(block);
      if(block.type==='link'){ if(typeof block.text!=='string') block.text=''; if(typeof block.url!=='string') block.url=''; }
      if(['text','h1','h2','h3','bullet','number','todo','toggle','quote','callout'].includes(block.type)) inlineLinksForBlock(block);
      if(isListBlock(block)) setListIndentLevel(block,listIndentLevel(block)); else if('indent' in block) delete block.indent;
      if(block.type==='columns') normalizeColumnsBlock(block);
    }
    return blocks.filter(Boolean);
  }

  function flattenBlocks(blocks,out=[]){
    for(const block of blocks||[]){
      out.push(block);
      if(block?.type==='columns') for(const col of block.columns||[]) flattenBlocks(col.blocks,out);
    }
    return out;
  }

  function codeBlockHTML(block,gutter){
    const language=CODE_LANGUAGES.some(([id])=>id===block.language)?block.language:'bash';
    const text=String(block.text||'');
    const wrap=block.codeWrap===true, lineNumbers=block.codeLineNumbers===true;
    const mermaidPreview=language==='mermaid' && block.mermaidPreview!==false;
    const rows=Math.max(3,text.split('\n').length);
    const nums=text.split('\n').map((_,i)=>`<span>${i+1}</span>`).join('');
    const previewButton=language==='mermaid'?`<button class="code-tool-btn ${mermaidPreview?'active':''}" data-mermaid-preview-toggle title="${mermaidPreview?'Hide':'Show'} diagram preview" aria-label="Toggle Mermaid preview"><svg class="mermaid-preview-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"></path><circle cx="12" cy="12" r="2.7"></circle></svg></button>`:'';
    const preview=language==='mermaid'?`<div class="mermaid-preview ${mermaidPreview?'':'hidden'}" data-mermaid-preview><div class="mermaid-preview-status" data-mermaid-status>Rendering diagram…</div><div class="mermaid-render" data-mermaid-render></div></div>`:'';
    return `<div class="block-row code-block" data-block-id="${block.id}" data-type="code">${gutter}<div class="code-block-shell"><div class="code-toolbar"><select class="code-language-select" data-code-language aria-label="Code language">${CODE_LANGUAGES.map(([id,label])=>`<option value="${id}" ${language===id?'selected':''}>${label}</option>`).join('')}</select><div class="code-toolbar-actions">${previewButton}<button class="code-tool-btn" data-code-copy title="Copy code" aria-label="Copy code"><span class="code-copy-icon">⧉</span></button><button class="code-tool-btn ${wrap?'active':''}" data-code-wrap title="${wrap?'Disable':'Enable'} line wrapping" aria-label="Toggle line wrapping"><span class="code-wrap-icon">↵</span></button><button class="code-tool-btn" data-code-more title="More code options" aria-label="More code options"><svg class="more-dots-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="5" cy="12" r="1.6"></circle><circle cx="12" cy="12" r="1.6"></circle><circle cx="19" cy="12" r="1.6"></circle></svg></button></div></div><div class="code-editor-wrap ${wrap?'wrap':''}"><div class="code-line-numbers ${lineNumbers?'':'hidden'}" data-code-line-numbers>${nums}</div><div class="code-editor-stack"><pre class="code-highlight" data-code-highlight aria-hidden="true"><code>${highlightCode(text,language)}</code></pre><textarea class="code-input" data-code-editor rows="${rows}" wrap="${wrap?'soft':'off'}" spellcheck="false" autocomplete="off" autocapitalize="off">${escapeHtml(text)}</textarea></div></div>${preview}</div></div>`;
  }

  function highlightCode(code,language){
    code=String(code||'');
    if(language==='plain') return escapeHtml(code);
    if(language==='html'||language==='xml') return highlightMarkup(code);
    if(language==='mermaid') return highlightMermaid(code);

    const keywordSet=new Set((CODE_KEYWORDS[language]||'').split(/\s+/).filter(Boolean));
    const hashComment=['python','bash','yaml'].includes(language);
    const sqlComment=language==='sql';
    const slashComment=!['python','bash','yaml','sql','html','xml'].includes(language);

    // Build the tokenizer from RegExp.source values so escaping stays valid.
    const parts=[
      /`(?:\\.|[^`\\])*`/.source,
      /"(?:\\.|[^"\\])*"/.source,
      /'(?:\\.|[^'\\])*'/.source
    ];
    if(slashComment) parts.push(/\/\*[\s\S]*?\*\//.source,/\/\/[^\n]*/.source);
    if(hashComment) parts.push(/#[^\n]*/.source);
    if(sqlComment) parts.push(/--[^\n]*/.source,/\/\*[\s\S]*?\*\//.source);
    parts.push(/\b\d+(?:\.\d+)?\b/.source,/\b[A-Za-z_$][\w$]*\b/.source);

    const pattern=new RegExp(parts.join('|'),'g');
    let out='',last=0,m;
    while((m=pattern.exec(code))){
      out+=escapeHtml(code.slice(last,m.index));
      const token=m[0];
      let cls='';
      if((slashComment&&(token.startsWith('//')||token.startsWith('/*'))) ||
         (hashComment&&token.startsWith('#')) ||
         (sqlComment&&(token.startsWith('--')||token.startsWith('/*')))) cls='comment';
      else if(/^[\'"`]/.test(token)) cls='string';
      else if(/^\d/.test(token)) cls='number';
      else if(keywordSet.has(token)) cls='keyword';
      else if(/^[A-Z][A-Za-z0-9_$]*$/.test(token)) cls='type';
      else if(/^\w+$/.test(token) && /^\s*\(/.test(code.slice(pattern.lastIndex))) cls='function';
      out+=cls?`<span class="code-token ${cls}">${escapeHtml(token)}</span>`:escapeHtml(token);
      last=pattern.lastIndex;
    }
    return out+escapeHtml(code.slice(last));
  }

  function highlightMermaid(code){
    const keywordSet=new Set((CODE_KEYWORDS.mermaid||'').split(/\s+/).filter(Boolean));
    const pattern=/%%\{[\s\S]*?\}%%|%%[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|==>|-->|-.->|---|--|==|-\.|\b\d+(?:\.\d+)?\b|\b[A-Za-z][\w-]*\b/g;
    let out='',last=0,m;
    while((m=pattern.exec(code))){
      out+=escapeHtml(code.slice(last,m.index));
      const token=m[0]; let cls='';
      if(token.startsWith('%%{')) cls='directive';
      else if(token.startsWith('%%')) cls='comment';
      else if(/^[\'\"]/.test(token)) cls='string';
      else if(/^\d/.test(token)) cls='number';
      else if(/^(?:==>|-->|-.->|---|--|==|-\.)$/.test(token)) cls='operator';
      else if(keywordSet.has(token)) cls='keyword';
      else if(/^[A-Z][A-Za-z0-9_-]*$/.test(token)) cls='type';
      out+=cls?`<span class="code-token ${cls}">${escapeHtml(token)}</span>`:escapeHtml(token);
      last=pattern.lastIndex;
    }
    return out+escapeHtml(code.slice(last));
  }

  let mermaidLoadPromise=null;
  let mermaidConfiguredTheme=null;
  const mermaidPreviewTimers=new Map();
  const mermaidRenderTokens=new Map();
  let mermaidRenderSequence=0;

  function currentMermaidTheme(){ return document.body.classList.contains('dark')?'dark':'default'; }
  function configureMermaidTheme(api){
    const theme=currentMermaidTheme();
    if(mermaidConfiguredTheme===theme) return;
    api.initialize({startOnLoad:false,securityLevel:'strict',theme,suppressErrorRendering:true,fontFamily:'Inter, system-ui, sans-serif'});
    mermaidConfiguredTheme=theme;
  }

  function ensureMermaidLibrary(){
    if(mermaidLoadPromise) return mermaidLoadPromise;
    mermaidLoadPromise=import('https://cdn.jsdelivr.net/npm/mermaid@12/dist/mermaid.esm.min.mjs')
      .then(module=>{
        const api=module.default||module;
        configureMermaidTheme(api);
        return api;
      })
      .catch(error=>{ mermaidLoadPromise=null; throw new Error(`Could not load Mermaid: ${error?.message||error}`); });
    return mermaidLoadPromise;
  }

  function scheduleMermaidPreviews(root=els.blockEditor){
    requestAnimationFrame(()=>root?.querySelectorAll?.('.code-block[data-type="code"]').forEach(row=>{
      const b=findBlock(row.dataset.blockId);
      if(b?.language==='mermaid' && b.mermaidPreview!==false) renderMermaidPreview(row,b);
    }));
  }

  function scheduleMermaidPreview(row,b,delay=320){
    if(!row||!b||b.language!=='mermaid'||b.mermaidPreview===false) return;
    clearTimeout(mermaidPreviewTimers.get(b.id));
    mermaidPreviewTimers.set(b.id,setTimeout(()=>{ mermaidPreviewTimers.delete(b.id); if(row.isConnected) renderMermaidPreview(row,b); },delay));
  }

  async function renderMermaidPreview(row,b){
    const preview=row?.querySelector('[data-mermaid-preview]');
    if(!preview || preview.classList.contains('hidden') || b.language!=='mermaid') return;
    const renderTarget=preview.querySelector('[data-mermaid-render]');
    const status=preview.querySelector('[data-mermaid-status]');
    if(!renderTarget||!status) return;
    const source=String(b.text||'').trim();
    const token=Symbol(b.id); mermaidRenderTokens.set(b.id,token);
    renderTarget.replaceChildren();
    if(!source){ status.textContent='Write Mermaid syntax to preview the diagram.'; status.classList.remove('hidden','error'); return; }
    status.textContent='Rendering diagram…'; status.classList.remove('hidden','error');
    try{
      const api=await ensureMermaidLibrary();
      if(mermaidRenderTokens.get(b.id)!==token || !row.isConnected) return;
      configureMermaidTheme(api);
      const renderId=`novera-mermaid-${++mermaidRenderSequence}`;
      const result=await api.render(renderId,source);
      if(mermaidRenderTokens.get(b.id)!==token || !row.isConnected) return;
      renderTarget.innerHTML=result.svg;
      if(typeof result.bindFunctions==='function') result.bindFunctions(renderTarget);
      status.classList.add('hidden');
    }catch(error){
      if(mermaidRenderTokens.get(b.id)!==token || !row.isConnected) return;
      renderTarget.replaceChildren();
      status.textContent=mermaidErrorMessage(error); status.classList.add('error'); status.classList.remove('hidden');
    }
  }

  function mermaidErrorMessage(error){
    const message=String(error?.message||error||'Invalid Mermaid diagram').replace(/\s+/g,' ').trim();
    if(/Could not load Mermaid|failed to initialize/i.test(message)) return 'Mermaid preview is unavailable. Check your internet connection.';
    return `Diagram error: ${message.slice(0,220)}`;
  }

  function highlightMarkup(code){
    let out='',last=0; const re=/<!--[\s\S]*?-->|<\/?[A-Za-z][^>]*>/g; let m;
    while((m=re.exec(code))){
      out+=escapeHtml(code.slice(last,m.index)); const token=m[0];
      if(token.startsWith('<!--')) out+=`<span class="code-token comment">${escapeHtml(token)}</span>`;
      else out+=escapeHtml(token).replace(/^(&lt;\/?)([A-Za-z][\w:-]*)/, '$1<span class="code-token tag">$2</span>').replace(/([A-Za-z_:][\w:.-]*)(=)/g,'<span class="code-token attr">$1</span>$2');
      last=re.lastIndex;
    }
    return out+escapeHtml(code.slice(last));
  }

  function updateCodePreview(row,b,input){
    const language=CODE_LANGUAGES.some(([id])=>id===b.language)?b.language:'bash';
    const code=row?.querySelector('[data-code-highlight] code'); if(code) code.innerHTML=highlightCode(b.text||'',language);
    const nums=row?.querySelector('[data-code-line-numbers]'); if(nums) nums.innerHTML=String(b.text||'').split('\n').map((_,i)=>`<span>${i+1}</span>`).join('');
    syncCodeScroll(input);
    if(language==='mermaid') scheduleMermaidPreview(row,b);
  }

  function syncCodeScroll(input){ const pre=input?.closest('.code-editor-stack')?.querySelector('[data-code-highlight]'); if(pre){ pre.scrollLeft=input.scrollLeft; pre.scrollTop=input.scrollTop; } }
  function focusCodeBlock(id){ requestAnimationFrame(()=>document.querySelector(`.block-row[data-block-id="${id}"] [data-code-editor]`)?.focus()); }

  function copyCodeBlock(id){
    const b=findBlock(id); if(!b)return; const text=String(b.text||'');
    const fallback=()=>{ const ta=document.createElement('textarea'); ta.value=text; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select(); try{document.execCommand('copy');toast('Code copied');}catch{toast('Could not copy code');} ta.remove(); };
    if(navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(()=>toast('Code copied')).catch(fallback); else fallback();
  }

  function blockDeleteMenuItem(id){
    return `<button class="block-menu-item danger" data-block-menu-action="delete" data-block-id="${id}">Delete</button>`;
  }

  function showCodeOptions(row,id){
    const b=findBlock(id); if(!b)return; const r=row.getBoundingClientRect(), menuWidth=210, menuHeight=210;
    els.blockMenu.style.left=`${Math.max(8,Math.min(r.right-menuWidth,window.innerWidth-menuWidth-8))}px`; els.blockMenu.style.top=`${Math.max(8,Math.min(r.top+36,window.innerHeight-menuHeight-8))}px`; els.blockMenu.style.width=`${menuWidth}px`;
    const mermaidOption=b.language==='mermaid'?`<button class="block-menu-item" data-code-menu-action="mermaid-preview" data-block-id="${id}">${b.mermaidPreview!==false?'✓ ':''}Diagram preview</button>`:'';
    els.blockMenu.innerHTML=`<button class="block-menu-item" data-code-menu-action="copy" data-block-id="${id}">Copy code</button><button class="block-menu-item" data-code-menu-action="wrap" data-block-id="${id}">${b.codeWrap?'✓ ':''}Wrap lines</button><button class="block-menu-item" data-code-menu-action="lines" data-block-id="${id}">${b.codeLineNumbers?'✓ ':''}Line numbers</button>${mermaidOption}<div class="code-options-sep"></div><button class="block-menu-item" data-block-menu-action="turn-text" data-block-id="${id}">Turn into text</button>${blockDeleteMenuItem(id)}`;
    els.blockMenu.classList.remove('hidden');
  }

  function runCodeMenuAction(action,id){
    const b=findBlock(id); if(!b)return;
    if(action==='copy'){ copyCodeBlock(id); els.blockMenu.classList.add('hidden'); return; }
    if(action==='wrap') b.codeWrap=!b.codeWrap;
    if(action==='lines') b.codeLineNumbers=!b.codeLineNumbers;
    if(action==='mermaid-preview') b.mermaidPreview=b.mermaidPreview===false;
    scheduleSave(); els.blockMenu.classList.add('hidden'); renderBlocks(currentPage()); focusCodeBlock(id);
  }

  function pageBlockHTML(block, gutter){
    const target=pageById(block.pageId);
    if(!target){
      return `<div class="block-row page-block missing" data-block-id="${block.id}" data-type="page">${gutter}<div class="page-block-link disabled"><span class="page-block-icon">⚠</span><span class="page-block-title">Missing page</span></div></div>`;
    }
    return `<div class="block-row page-block" data-block-id="${block.id}" data-type="page">${gutter}<button class="page-block-link" data-page-block-open="${target.id}" title="Open page · Middle-click for new tab"><span class="page-block-icon">${pageIconMarkup(target.icon)}</span><span class="page-block-title">${escapeHtml(target.title||'Untitled')}</span><span class="page-block-arrow">›</span></button></div>`;
  }

  function imageLinkEditorHTML(block){
    if(activeImageLinkBlockId!==block.id) return '';
    const current = block.src && !block.src.startsWith('data:') ? block.src : '';
    return `<div class="image-url-editor" data-image-url-editor><div class="image-url-row"><input class="image-url-input" data-image-url-input type="url" inputmode="url" autocomplete="off" spellcheck="false" placeholder="https://example.com/image.jpg" value="${escapeHtml(current)}"><button class="image-url-submit" data-image-url-submit>Embed</button><button class="image-url-cancel" data-image-url-cancel>Cancel</button></div><div class="image-url-help">Paste a direct, public image URL. The image is tested before it is saved.</div><div class="image-url-error" data-image-url-error></div></div>`;
  }

  function imageHTML(block, gutter){
    const caption=escapeHtml(block.caption||'');
    const linkEditor=imageLinkEditorHTML(block);
    if(!block.src){
      return `<div class="block-row image-block" data-block-id="${block.id}" data-type="image">${gutter}<div class="image-block-body"><div class="image-empty"><div class="image-empty-icon">🖼️</div><div class="image-empty-copy"><div class="image-empty-title">Add an image</div><div class="image-empty-sub">Upload from your device or embed with a link.</div></div><div class="image-buttons"><button class="image-action-btn" data-image-upload>Upload</button><button class="image-action-btn" data-image-url>Embed link</button></div></div>${linkEditor}</div></div>`;
    }
    return `<div class="block-row image-block" data-block-id="${block.id}" data-type="image">${gutter}<div class="image-block-body"><figure class="image-figure"><div class="image-preview"><img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt||block.caption||'Image')}" loading="lazy" decoding="async"><div class="image-toolbar"><button data-image-upload>Replace</button><button data-image-url>Link</button><button data-image-remove>Remove</button></div></div>${linkEditor}<figcaption class="image-caption" contenteditable="true" data-image-caption data-placeholder="Write a caption…">${caption}</figcaption></figure></div></div>`;
  }

  function databaseHTML(block){
    const cols = block.columns || ['Name','Status'];
    const rows = block.rows || [];
    return `<div class="block-row database-block" data-block-id="${block.id}" data-type="database">
      <div class="block-gutter"><button data-block-action="add">＋</button><button draggable="true" data-block-action="drag" title="Drag / options" aria-label="Drag / options"><svg class="block-drag-icon" viewBox="0 0 12 22" aria-hidden="true" focusable="false"><circle cx="3.5" cy="3.5"/><circle cx="8.5" cy="3.5"/><circle cx="3.5" cy="11"/><circle cx="8.5" cy="11"/><circle cx="3.5" cy="18.5"/><circle cx="8.5" cy="18.5"/></svg></button></div>
      <div style="width:100%">
        <div class="database-title"><strong contenteditable="true" data-db-title>${escapeHtml(block.title||'Untitled database')}</strong><button class="ghost-btn" data-db-add-col>＋ Property</button></div>
        <div class="db-table-wrap"><table class="db-table"><thead><tr>${cols.map((c,ci)=>`<th contenteditable="true" data-db-col="${ci}">${escapeHtml(c)}</th>`).join('')}</tr></thead>
        <tbody>${rows.map((r,ri)=>`<tr>${cols.map((_,ci)=>`<td><div contenteditable="true" data-db-cell="${ri}:${ci}">${escapeHtml(r[ci]||'')}</div></td>`).join('')}</tr>`).join('')}</tbody></table>
        <button class="db-add-row" data-db-add-row>＋ New</button></div>
      </div>
    </div>`;
  }

  function isListBlock(block){ return !!block && (block.type==='bullet' || block.type==='number'); }
  function listIndentLevel(block){ return isListBlock(block)?Math.max(0,Math.min(8,Math.floor(Number(block.indent)||0))):0; }
  function setListIndentLevel(block,level){
    if(!isListBlock(block)) return;
    const next=Math.max(0,Math.min(8,Math.floor(Number(level)||0)));
    if(next) block.indent=next; else delete block.indent;
  }
  function listSubtreeEnd(blocks,index){
    const root=blocks[index], base=listIndentLevel(root); let end=index+1;
    while(end<blocks.length && isListBlock(blocks[end]) && listIndentLevel(blocks[end])>base) end++;
    return end;
  }
  function changeListIndent(blocks,index,direction){
    const block=blocks[index]; if(!isListBlock(block)) return false;
    const current=listIndentLevel(block); let target=current;
    if(direction>0){
      if(index<=0 || !isListBlock(blocks[index-1])) return false;
      const maxAllowed=Math.min(8,listIndentLevel(blocks[index-1])+1);
      target=Math.min(current+1,maxAllowed);
      if(target<=current) return false;
    }else{
      if(current<=0) return false;
      target=current-1;
    }
    const delta=target-current, end=listSubtreeEnd(blocks,index);
    for(let i=index;i<end;i++) setListIndentLevel(blocks[i],listIndentLevel(blocks[i])+delta);
    return true;
  }

  function numberForBlock(id, blocks){
    const index=blocks.findIndex(block=>block?.id===id);
    if(index<0) return 1;
    const target=blocks[index], indent=listIndentLevel(target);
    let n=1;
    for(let i=index-1;i>=0;i--){
      const block=blocks[i];
      if(!isListBlock(block)) break;
      const level=listIndentLevel(block);
      if(level<indent) break;
      if(level>indent) continue;
      if(block.type!=='number') break;
      n++;
    }
    return n;
  }

  function bindEvents(){
    document.addEventListener('click', onClick);
    document.addEventListener('auxclick', onAuxClick);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('pointerdown', onPaneResizeStart);
    document.addEventListener('input', onInput);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('change', onChange);
    document.addEventListener('dragstart', onDragStart);
    document.addEventListener('dragover', onDragOver);
    document.addEventListener('dragleave', e=>{ const zone=e.target.closest?.('[data-external-icon-dropzone]'); if(zone && (!e.relatedTarget || !zone.contains(e.relatedTarget))) zone.classList.remove('drag-over'); });
    document.addEventListener('drop', onDrop);
    document.addEventListener('paste', onPaste);
    document.addEventListener('copy', onCopy);
    document.addEventListener('cut', onCut);
    document.addEventListener('beforeinput', onBeforeInput);
    document.addEventListener('dragend', clearDragState);
    document.addEventListener('scroll', e=>{ if(e.target?.matches?.('[data-code-editor]')) syncCodeScroll(e.target); if(multiBlockSelection?.active) renderMultiBlockSelection(); }, true);
    window.addEventListener('resize', ()=>{ hideFloatingMenus(); updateSidebarOverflow(); if(multiBlockSelection?.active) renderMultiBlockSelection(); });
  }

  function onPaneResizeStart(e){
    const handle=e.target.closest('[data-resizer]'); if(!handle || e.button!==0) return;
    e.preventDefault(); const side=handle.dataset.resizer; document.body.classList.add('resizing-pane'); handle.classList.add('resizing');
    const move=ev=>{
      if(side==='left'){ state.sidebarWidth=Math.max(210,Math.min(420,ev.clientX-44)); }
      else { state.rightSidebarWidth=Math.max(220,Math.min(420,window.innerWidth-ev.clientX)); }
      updateWorkspaceChrome();
    };
    const up=()=>{ document.body.classList.remove('resizing-pane'); handle.classList.remove('resizing'); window.removeEventListener('pointermove',move); window.removeEventListener('pointerup',up); scheduleSave(); };
    window.addEventListener('pointermove',move); window.addEventListener('pointerup',up,{once:true});
  }

  function onClick(e){
    const ribbon=e.target.closest('[data-ribbon-action]');
    if(ribbon){
      const action=ribbon.dataset.ribbonAction;
      if(action==='toggle-left'){ state.sidebarOpen=!state.sidebarOpen; scheduleSave(); updateWorkspaceChrome(); return; }
      if(action==='files'||action==='favorites'){
        state.leftPanelMode=action; state.sidebarOpen=true; scheduleSave(); renderSidebar(); updateWorkspaceChrome(); return;
      }
      if(action==='toggle-right'){ state.rightSidebarOpen=!state.rightSidebarOpen; scheduleSave(); updateWorkspaceChrome(); return; }
      if(action==='search'){ openCommandPalette(); return; }
      if(action==='home'){ if(state.currentPageId!=='__home__') cancelPageOperations(); state.currentPageId='__home__'; state.activeTabId=null; scheduleSave(); renderAll(); return; }
      if(action==='new'){ createPage(); return; }
      if(action==='settings'){ updateSettingsText(); els.settingsModal.classList.remove('hidden'); return; }
    }
    const rightMode=e.target.closest('[data-right-mode]');
    if(rightMode){ state.rightPanelMode=rightMode.dataset.rightMode; scheduleSave(); renderRightSidebar(); return; }
    const outline=e.target.closest('[data-outline-block]');
    if(outline){ document.querySelector(`.block-row[data-block-id="${outline.dataset.outlineBlock}"]`)?.scrollIntoView({behavior:'smooth',block:'center'}); return; }
    const backlink=e.target.closest('[data-backlink-page]');
    if(backlink){ openPage(backlink.dataset.backlinkPage); return; }
    const tabClose = e.target.closest('[data-tab-close]');
    if (tabClose){ e.stopPropagation(); closeTab(tabClose.dataset.tabClose); return; }
    const tab = e.target.closest('.editor-tab[data-tab-id]');
    if (tab){ activateTab(tab.dataset.tabId); return; }
    if (e.target.closest('#newTabBtn')){ createPage(); return; }
    const pageRow = e.target.closest('.page-tree-row');
    if (pageRow){
      const id=pageRow.dataset.pageId;
      if (e.target.closest('[data-action="toggle-page"]')) { const p=pageById(id); p.expanded=!p.expanded; scheduleSave(); renderSidebar(); return; }
      if (e.target.closest('[data-action="open-page"]')) { openPage(id); return; }
      if (e.target.closest('[data-action="page-more"]')) { showPageMenu(pageRow,id); return; }
    }
    const crumb=e.target.closest('[data-crumb-id]'); if(crumb){ openPage(crumb.dataset.crumbId); return; }
    const homeCard=e.target.closest('[data-home-page]'); if(homeCard){ openPage(homeCard.dataset.homePage); return; }
    const homeAction=e.target.closest('[data-home-action="new"]'); if(homeAction){ createPage(); return; }
    if(e.target.closest('#newPageBtn')||e.target.closest('#newPageFooterBtn')){ e.preventDefault(); e.stopPropagation(); createPage(); return; }
    if(e.target.closest('#createVaultBtn')){ e.preventDefault(); e.stopPropagation(); createVault(); return; }
    if(e.target.closest('#renameVaultBtn')){ e.preventDefault(); e.stopPropagation(); renameVault(); return; }
    if(e.target.closest('#deleteVaultBtn')){ e.preventDefault(); e.stopPropagation(); deleteVault(); return; }
    if(e.target.closest('#vaultDialogConfirm')){ e.preventDefault(); submitVaultDialog(); return; }
    if(e.target.closest('[data-vault-dialog-cancel]')){ e.preventDefault(); closeVaultDialog(); return; }
    if(e.target.closest('[data-action="home"]')){ if(state.currentPageId!=='__home__') cancelPageOperations(); state.currentPageId='__home__'; state.activeTabId=null; scheduleSave(); renderAll(); return; }
    if(e.target.closest('[data-action="search"]')){ openCommandPalette(); return; }
    if(e.target.closest('#sidebarToggle')){ state.sidebarOpen=false; scheduleSave(); updateWorkspaceChrome(); return; }
    if(e.target.closest('#sidebarOpen')){ state.sidebarOpen=true; scheduleSave(); updateWorkspaceChrome(); return; }
    if(e.target.closest('#rightSidebarToggle')){ state.rightSidebarOpen=!state.rightSidebarOpen; scheduleSave(); updateWorkspaceChrome(); return; }
    if(e.target.closest('#undoBtn')){ undoWorkspace(); return; }
    if(e.target.closest('#redoBtn')){ redoWorkspace(); return; }
    if(e.target.closest('#favoriteBtn')){ const p=currentPage(); p.favorite=!p.favorite; scheduleSave(); renderSidebar(); els.favoriteBtn.textContent=p.favorite?'★':'☆'; return; }
    if(e.target.closest('#addIconBtn')||e.target.closest('#pageIcon')){ showIconMenu(e.target.closest('#addIconBtn')||e.target.closest('#pageIcon')); return; }
    if(e.target.closest('#addCommentBtn')){ openComments(); return; }
    if(e.target.closest('#shareBtn')){ els.shareModal.classList.remove('hidden'); return; }
    if(e.target.matches('[data-close-modal]')|| (e.target.classList.contains('modal-backdrop'))){ e.target.closest('.modal-backdrop')?.classList.add('hidden'); return; }
    if(e.target.closest('#publishToggle')){ e.target.closest('#publishToggle').classList.toggle('on'); toast('Public sharing updated'); return; }
    if(e.target.closest('#themeToggle')){ cycleTheme(); return; }
    if(e.target.closest('#exportBtn')){ exportWorkspace(); return; }
    if(e.target.closest('#importBtn')){ els.importFile.click(); return; }
    if(e.target.closest('#resetBtn')){ state=clone(DEFAULT_WORKSPACE); state.name=activeVaultMeta()?.name||state.name; persistStateNow(); applyTheme(); renderAll(); els.settingsModal.classList.add('hidden'); toast('Current vault reset'); return; }

    const emojiChoice=e.target.closest('[data-emoji-choice]');
    if(emojiChoice){ chooseEmoji(emojiChoice.dataset.emojiChoice); return; }

    const iconTab=e.target.closest('[data-icon-picker-tab]');
    if(iconTab){ switchIconPickerTab(iconTab.dataset.iconPickerTab); return; }
    const iconChoice=e.target.closest('[data-icon-choice]');
    if(iconChoice){ setPageIcon(iconChoice.dataset.iconChoice); return; }
    if(e.target.closest('[data-remove-icon]')){ setPageIcon(''); return; }
    if(e.target.closest('[data-custom-icon-submit]')){ const input=els.pageMetaMenu.querySelector('[data-custom-icon-input]'); if(input?.value.trim()) setPageIcon(input.value.trim().slice(0,12)); return; }
    if(e.target.closest('[data-external-icon-submit]')){ const input=els.pageMetaMenu.querySelector('[data-external-icon-url]'); if(input) applyExternalIconUrl(input.value); return; }
    if(e.target.closest('[data-external-icon-upload]')||e.target.closest('[data-external-icon-dropzone]')){ e.preventDefault(); els.pageIconFileInput?.click(); return; }
    if(e.target.closest('[data-comment-submit]')){ addPageComment(); return; }
    if(e.target.closest('[data-comments-close]')){ els.pageComments.classList.add('hidden'); return; }
    const delComment=e.target.closest('[data-comment-delete]');
    if(delComment){ deletePageComment(delComment.dataset.commentDelete); return; }

    const pageBlockLink=e.target.closest('[data-page-block-open]');
    if(pageBlockLink){ openPage(pageBlockLink.dataset.pageBlockOpen); return; }

    const inlineLink=e.target.closest('a[data-inline-link]');
    if(inlineLink && (e.ctrlKey||e.metaKey)){ e.preventDefault(); window.open(inlineLink.href,'_blank','noopener,noreferrer'); return; }

    const blockRow=e.target.closest('.block-row');
    if(blockRow){
      const id=blockRow.dataset.blockId;
      if(e.target.closest('[data-code-copy]')){ copyCodeBlock(id); return; }
      if(e.target.closest('[data-mermaid-preview-toggle]')){ const b=findBlock(id); if(b?.language==='mermaid'){ b.mermaidPreview=b.mermaidPreview===false; scheduleSave(); renderBlocks(currentPage()); focusCodeBlock(id); } return; }
      if(e.target.closest('[data-code-wrap]')){ const b=findBlock(id); if(b){ b.codeWrap=!b.codeWrap; scheduleSave(); renderBlocks(currentPage()); focusCodeBlock(id); } return; }
      if(e.target.closest('[data-code-more]')){ showCodeOptions(blockRow,id); return; }
      if(e.target.closest('[data-table-select]')){ selectSimpleTable(id); return; }
      const rowMenu=e.target.closest('[data-table-row-menu]');
      if(rowMenu){ showSimpleTableAxisMenu(rowMenu,id,'row',Number(rowMenu.dataset.tableRowMenu)); return; }
      const colMenu=e.target.closest('[data-table-col-menu]');
      if(colMenu){ showSimpleTableAxisMenu(colMenu,id,'col',Number(colMenu.dataset.tableColMenu)); return; }
      if(e.target.closest('[data-table-add-row]')){ const b=findBlock(id); if(b){ normalizeSimpleTableBlock(b); const ri=b.tableRows.length; b.tableRows.push(Array(b.tableRows[0].length).fill('')); scheduleSave(); renderBlocks(currentPage()); focusSimpleTableCell(id,ri,0); } return; }
      if(e.target.closest('[data-table-add-col]')){ const b=findBlock(id); if(b){ normalizeSimpleTableBlock(b); const ci=b.tableRows[0].length; b.tableRows.forEach(r=>r.push('')); scheduleSave(); renderBlocks(currentPage()); focusSimpleTableCell(id,0,ci); } return; }
      if(e.target.closest('[data-table-header-row]')){ const b=findBlock(id); if(b){ b.tableHeaderRow=!b.tableHeaderRow; scheduleSave(); renderBlocks(currentPage()); } return; }
      if(e.target.closest('[data-table-header-col]')){ const b=findBlock(id); if(b){ b.tableHeaderColumn=!b.tableHeaderColumn; scheduleSave(); renderBlocks(currentPage()); } return; }
      if(e.target.closest('[data-block-action="add"]')){ addBlockAfter(id); return; }
      if(e.target.closest('[data-block-action="drag"]')){ showBlockMenu(blockRow,id); return; }
      if(e.target.closest('[data-image-upload]')){ chooseImageFile(id); return; }
      if(e.target.closest('[data-image-url]')){ openImageUrlEditor(id); return; }
      if(e.target.closest('[data-image-url-submit]')){ commitImageUrl(id, blockRow.querySelector('[data-image-url-input]')); return; }
      if(e.target.closest('[data-image-url-cancel]')){ activeImageLinkBlockId=null; renderBlocks(currentPage()); return; }
      if(e.target.closest('[data-image-remove]')){ const b=findBlock(id); if(b){ b.src=''; b.alt=''; scheduleSave(); renderBlocks(currentPage()); } return; }
      if(e.target.closest('.toggle-prefix')){ const b=findBlock(id); b.open=!b.open; scheduleSave(); renderCurrentBlocksKeepFocus(); return; }
      if(e.target.matches('[data-db-add-row]')){ const b=findBlock(id); b.rows.push(b.columns.map(()=>'')); scheduleSave(); renderCurrentBlocksKeepFocus(); return; }
      if(e.target.matches('[data-db-add-col]')){ const b=findBlock(id); b.columns.push('Property'); b.rows.forEach(r=>r.push('')); scheduleSave(); renderCurrentBlocksKeepFocus(); return; }
    }

    const tableAxisAction=e.target.closest('[data-table-axis-action]'); if(tableAxisAction){ runSimpleTableAxisAction(tableAxisAction); return; }
    const codeMenuAction=e.target.closest('[data-code-menu-action]'); if(codeMenuAction){ runCodeMenuAction(codeMenuAction.dataset.codeMenuAction,codeMenuAction.dataset.blockId); return; }
    const slashItem=e.target.closest('[data-slash-type]'); if(slashItem){ applySlashType(slashItem.dataset.slashType); return; }
    const cmd=e.target.closest('[data-command]'); if(cmd){ runCommand(cmd.dataset.command,cmd.dataset.pageId); return; }
    const blockMenuAction=e.target.closest('[data-block-menu-action]'); if(blockMenuAction){ runBlockMenuAction(blockMenuAction.dataset.blockMenuAction,blockMenuAction.dataset.blockId); return; }

    if(!e.target.closest('.floating-menu')) hideFloatingMenus();
  }

  function onMouseDown(e){
    if(e.button===0){
      const tableCell=e.target.closest?.('[data-table-cell]');
      if(tableCell && els.blockEditor?.contains(tableCell)){
        beginTableCellSelection(e,tableCell);
      }else{
        clearTableCellSelection();
        if(selectedTableBlockId && !e.target.closest?.('[data-table-select]')) clearSelectedTable();
        const content=e.target.closest?.('.block-content[contenteditable="true"]');
        if(content && els.blockEditor?.contains(content)) beginMultiBlockSelection(e,content);
        else clearMultiBlockSelection();
      }
    }
    if(e.button!==1) return;
    if(e.target.closest('.editor-tab[data-tab-id], .page-tree-row [data-action="open-page"], [data-crumb-id], [data-home-page], [data-page-block-open]')) e.preventDefault();
  }

  function selectableBlockContents(){
    return Array.from(els.blockEditor?.querySelectorAll?.('.block-content[contenteditable="true"]')||[]).filter(el=>el.isConnected && el.offsetParent!==null);
  }

  function contentBoundaryPoint(content,atEnd=false){
    if(!content) return null;
    if(!atEnd) return {node:content,offset:0,content};
    return {node:content,offset:content.childNodes.length,content};
  }

  function caretPointInContent(content,x,y){
    if(!content) return null;
    let node=null,offset=0;
    try{
      if(document.caretPositionFromPoint){ const p=document.caretPositionFromPoint(x,y); node=p?.offsetNode||null; offset=p?.offset||0; }
      else if(document.caretRangeFromPoint){ const r=document.caretRangeFromPoint(x,y); node=r?.startContainer||null; offset=r?.startOffset||0; }
    }catch{}
    if(node && (node===content || content.contains(node))) return {node,offset,content};
    const rect=content.getBoundingClientRect();
    const atEnd=y>rect.bottom || (y>=rect.top && y<=rect.bottom && x>rect.left+rect.width*.5);
    return contentBoundaryPoint(content,atEnd);
  }

  function nearestSelectableContent(x,y){
    const pointElement=document.elementFromPoint(x,y);
    const direct=pointElement?.closest?.('.block-content[contenteditable="true"]');
    if(direct && els.blockEditor?.contains(direct)) return direct;
    const contents=selectableBlockContents();
    const table=pointElement?.closest?.('.simple-table-block');
    if(table && els.blockEditor?.contains(table)){
      let before=null,after=null;
      for(const content of contents){
        const relation=table.compareDocumentPosition(content);
        if(relation&Node.DOCUMENT_POSITION_PRECEDING) before=content;
        if(!after && relation&Node.DOCUMENT_POSITION_FOLLOWING) after=content;
      }
      const anchor=multiBlockSelection?.anchor?.content;
      if(anchor){
        const tableAfterAnchor=!!(anchor.compareDocumentPosition(table)&Node.DOCUMENT_POSITION_FOLLOWING);
        return tableAfterAnchor?(after||before):(before||after);
      }
      const rect=table.getBoundingClientRect();
      return y<rect.top+rect.height/2?(before||after):(after||before);
    }
    let best=null,bestDistance=Infinity;
    for(const content of contents){
      const r=content.getBoundingClientRect();
      const distance=y<r.top?r.top-y:y>r.bottom?y-r.bottom:0;
      if(distance<bestDistance){ best=content; bestDistance=distance; }
    }
    return bestDistance<=32?best:null;
  }

  function pointOrder(a,b,contents=selectableBlockContents()){
    const ai=contents.indexOf(a?.content), bi=contents.indexOf(b?.content);
    if(ai!==bi) return ai-bi;
    if(ai<0) return 0;
    try{
      const ar=document.createRange(), br=document.createRange();
      ar.setStart(a.node,a.offset); ar.collapse(true); br.setStart(b.node,b.offset); br.collapse(true);
      return ar.compareBoundaryPoints(Range.START_TO_START,br);
    }catch{return 0;}
  }

  function orderedMultiSelectionPoints(selection=multiBlockSelection){
    if(!selection?.anchor || !selection?.focus) return null;
    const contents=selectableBlockContents();
    const order=pointOrder(selection.anchor,selection.focus,contents);
    return order<=0?{start:selection.anchor,end:selection.focus,contents}:{start:selection.focus,end:selection.anchor,contents};
  }

  function multiSelectionRanges(selection=multiBlockSelection){
    const ordered=orderedMultiSelectionPoints(selection); if(!ordered) return [];
    const {start,end,contents}=ordered, startIndex=contents.indexOf(start.content), endIndex=contents.indexOf(end.content);
    if(startIndex<0 || endIndex<startIndex) return [];
    const ranges=[];
    for(let i=startIndex;i<=endIndex;i++){
      const content=contents[i], range=document.createRange();
      try{
        if(i===startIndex) range.setStart(start.node,start.offset); else range.setStart(content,0);
        if(i===endIndex) range.setEnd(end.node,end.offset); else range.setEnd(content,content.childNodes.length);
        if(!range.collapsed) ranges.push({content,range});
      }catch{}
    }
    return ranges;
  }

  function multiSelectionTables(selection=multiBlockSelection){
    const ordered=orderedMultiSelectionPoints(selection); if(!ordered) return [];
    const {start,end}=ordered;
    if(start.content===end.content) return [];
    return Array.from(els.blockEditor?.querySelectorAll?.('.simple-table-block[data-block-id]')||[]).filter(table=>{
      if(!table.isConnected || table.offsetParent===null) return false;
      const afterStart=!!(start.content.compareDocumentPosition(table)&Node.DOCUMENT_POSITION_FOLLOWING);
      const beforeEnd=!!(table.compareDocumentPosition(end.content)&Node.DOCUMENT_POSITION_FOLLOWING);
      return afterStart&&beforeEnd;
    });
  }

  function compareNodesInDocument(a,b){
    if(a===b) return 0;
    const rel=a.compareDocumentPosition(b);
    if(rel&Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if(rel&Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  }

  function multiSelectionLayer(){
    let layer=document.getElementById('multiBlockSelectionLayer');
    if(!layer){ layer=document.createElement('div'); layer.id='multiBlockSelectionLayer'; layer.className='multi-block-selection-layer'; document.body.appendChild(layer); }
    return layer;
  }

  function renderMultiBlockSelection(){
    const layer=multiSelectionLayer(); layer.innerHTML='';
    if(!multiBlockSelection?.active) return;
    for(const {range} of multiSelectionRanges()){
      for(const rect of range.getClientRects()){
        if(rect.width<.5 || rect.height<.5) continue;
        const mark=document.createElement('span'); mark.className='multi-block-selection-rect';
        mark.style.left=`${rect.left}px`; mark.style.top=`${rect.top}px`; mark.style.width=`${rect.width}px`; mark.style.height=`${rect.height}px`;
        layer.appendChild(mark);
      }
    }
    for(const table of multiSelectionTables()){
      const target=table.querySelector('.simple-table-scroll')||table, rect=target.getBoundingClientRect();
      if(rect.width<.5||rect.height<.5) continue;
      const mark=document.createElement('span'); mark.className='multi-block-selection-rect multi-block-selection-table';
      mark.style.left=`${rect.left}px`; mark.style.top=`${rect.top}px`; mark.style.width=`${rect.width}px`; mark.style.height=`${rect.height}px`;
      layer.appendChild(mark);
    }
  }

  function clearMultiBlockSelection(){
    if(multiBlockSelection?.dragging){ window.removeEventListener('mousemove',onMultiBlockSelectionMove,true); window.removeEventListener('mouseup',onMultiBlockSelectionEnd,true); }
    multiBlockSelection=null;
    const layer=document.getElementById('multiBlockSelectionLayer'); if(layer) layer.innerHTML='';
  }

  function beginMultiBlockSelection(e,content){
    clearMultiBlockSelection();
    const anchor=caretPointInContent(content,e.clientX,e.clientY); if(!anchor) return;
    multiBlockSelection={anchor,focus:anchor,active:false,dragging:true,startX:e.clientX,startY:e.clientY};
    window.addEventListener('mousemove',onMultiBlockSelectionMove,true);
    window.addEventListener('mouseup',onMultiBlockSelectionEnd,true);
  }

  function onMultiBlockSelectionMove(e){
    const selection=multiBlockSelection; if(!selection?.dragging) return;
    if(!(e.buttons&1)){ onMultiBlockSelectionEnd(e); return; }
    const content=nearestSelectableContent(e.clientX,e.clientY); if(!content) return;
    const focus=caretPointInContent(content,e.clientX,e.clientY); if(!focus) return;
    const crossedBlock=content!==selection.anchor.content;
    const moved=Math.hypot(e.clientX-selection.startX,e.clientY-selection.startY)>4;
    if(!selection.active && !(crossedBlock&&moved)) return;
    selection.active=true; selection.focus=focus;
    e.preventDefault();
    try{ window.getSelection()?.removeAllRanges(); }catch{}
    renderMultiBlockSelection();
  }

  function onMultiBlockSelectionEnd(e){
    const selection=multiBlockSelection; if(!selection) return;
    window.removeEventListener('mousemove',onMultiBlockSelectionMove,true); window.removeEventListener('mouseup',onMultiBlockSelectionEnd,true);
    selection.dragging=false;
    if(!selection.active){ multiBlockSelection=null; return; }
    const content=nearestSelectableContent(e.clientX,e.clientY);
    if(content){ const focus=caretPointInContent(content,e.clientX,e.clientY); if(focus) selection.focus=focus; }
    e.preventDefault?.();
    try{ window.getSelection()?.removeAllRanges(); }catch{}
    renderMultiBlockSelection();
  }

  function multiSelectionSegments(){
    const segments=[];
    if(!multiBlockSelection?.active) return segments;
    for(const {content,range} of multiSelectionRanges()){
      const row=content.closest('.block-row'), location=findBlockLocation(row?.dataset.blockId), block=location?.block;
      if(!block || !isTextLikeBlock(block)) continue;
      const start=localTextOffset(content,range.startContainer,range.startOffset);
      const end=localTextOffset(content,range.endContainer,range.endOffset);
      if(end<=start) continue;
      segments.push({content,range,row,location,block,start,end});
    }
    return segments;
  }

  function markdownEscapeLinkLabel(value){ return String(value||'').replace(/\\/g,'\\\\').replace(/\]/g,'\\]'); }
  function markdownEscapeLinkUrl(value){ return String(value||'').replace(/\\/g,'\\\\').replace(/[()]/g,m=>`\\${m}`); }

  function markdownInlineSlice(block,start,end){
    const text=String(block?.text||''), safeStart=Math.max(0,Math.min(text.length,start)), safeEnd=Math.max(safeStart,Math.min(text.length,end));
    const links=inlineLinksForBlock(block); if(!links.length) return text.slice(safeStart,safeEnd);
    let out='',cursor=safeStart;
    for(const link of links){
      const from=Math.max(safeStart,link.start), to=Math.min(safeEnd,link.end);
      if(to<=from) continue;
      if(from>cursor) out+=text.slice(cursor,from);
      out+=`[${markdownEscapeLinkLabel(text.slice(from,to))}](${markdownEscapeLinkUrl(link.url)})`;
      cursor=to;
    }
    return out+text.slice(cursor,safeEnd);
  }

  function markdownPrefixForBlock(block,location){
    if(!block) return '';
    const indent='  '.repeat(listIndentLevel(block));
    if(block.type==='bullet') return `${indent}- `;
    if(block.type==='number') return `${indent}${numberForBlock(block.id,location?.blocks||[])}. `;
    if(block.type==='todo') return `- [${block.checked?'x':' '}] `;
    if(block.type==='h1') return '# ';
    if(block.type==='h2') return '## ';
    if(block.type==='h3') return '### ';
    if(block.type==='quote' || block.type==='callout') return '> ';
    return '';
  }

  function selectedMultiBlockMarkdown(){
    const segments=multiSelectionSegments(); if(!segments.length) return '';
    const entries=segments.map(segment=>({kind:'text',node:segment.content,segment}));
    for(const row of multiSelectionTables()){
      const block=findBlock(row.dataset.blockId);
      if(block?.type==='table') entries.push({kind:'table',node:row,block});
    }
    entries.sort((a,b)=>compareNodesInDocument(a.node,b.node));
    return entries.map(entry=>{
      if(entry.kind==='table') return simpleTableMarkdown(entry.block);
      const {block,location,start,end}=entry.segment;
      const prefix=start===0?markdownPrefixForBlock(block,location):'';
      return prefix+markdownInlineSlice(block,start,end);
    }).join('\n');
  }

  function copyMultiBlockSelectionToClipboard(e){
    const markdown=selectedMultiBlockMarkdown(); if(!markdown) return false;
    e?.preventDefault?.();
    e?.clipboardData?.setData?.('text/plain',markdown);
    e?.clipboardData?.setData?.('text/markdown',markdown);
    return true;
  }

  function onCopy(e){
    if(copySelectedTableCellsToClipboard(e)) return;
    if(copySelectedTableToClipboard(e)) return;
    copyMultiBlockSelectionToClipboard(e);
  }
  function onCut(e){
    if(copySelectedTableCellsToClipboard(e)){ clearSelectedTableCells(); return; }
    if(copySelectedTableToClipboard(e)) return;
    if(!multiBlockSelection?.active) return;
    if(copyMultiBlockSelectionToClipboard(e)) deleteMultiBlockSelection();
  }

  function localTextOffset(content,node,offset){
    try{ const range=document.createRange(); range.selectNodeContents(content); range.setEnd(node,offset); return range.toString().length; }catch{return 0;}
  }

  function deleteBlockTextRange(block,start,end){
    const original=String(block?.text||''), safeStart=Math.max(0,Math.min(original.length,start)), safeEnd=Math.max(safeStart,Math.min(original.length,end));
    if(safeEnd<=safeStart) return;
    const links=inlineLinksAroundRange(block,safeStart,safeEnd), rightShift=safeStart;
    block.text=original.slice(0,safeStart)+original.slice(safeEnd);
    const merged=[...links.left,...links.right.map(link=>({start:link.start+rightShift,end:link.end+rightShift,url:link.url}))];
    block.inlineLinks=normalizeInlineLinkRanges(merged,block.text.length); if(!block.inlineLinks.length) delete block.inlineLinks;
  }

  function normalizeListIndentation(blocks){
    if(!Array.isArray(blocks)) return;
    let previous=null;
    for(const block of blocks){
      if(!isListBlock(block)){ previous=block; continue; }
      let level=listIndentLevel(block);
      if(!isListBlock(previous)) level=0;
      else level=Math.min(level,listIndentLevel(previous)+1);
      setListIndentLevel(block,level);
      previous=block;
    }
  }

  function deleteMultiBlockSelection(){
    const segments=multiSelectionSegments(); if(!segments.length){ clearMultiBlockSelection(); return false; }
    const selectedTables=multiSelectionTables().map(row=>row.dataset.blockId).filter(Boolean);
    const first=segments[0], firstContainer=first.location.blocks, firstIndex=first.location.index;
    const affectedLists=new Set();
    let focusId=null,focusOffset=0;

    for(let i=segments.length-1;i>=0;i--){
      const {block,start,end}=segments[i], location=findBlockLocation(block.id); if(!location) continue;
      const textLength=String(block.text||'').length, fullBlock=start===0 && end>=textLength;
      if(fullBlock){
        affectedLists.add(location.blocks);
        location.blocks.splice(location.index,1);
      }else{
        deleteBlockTextRange(block,start,end);
        if(i===0){ focusId=block.id; focusOffset=start; }
      }
    }

    for(let i=selectedTables.length-1;i>=0;i--){
      const location=findBlockLocation(selectedTables[i]);
      if(location){ affectedLists.add(location.blocks); location.blocks.splice(location.index,1); }
    }
    for(const blocks of affectedLists){ normalizeListIndentation(blocks); ensureBlockList(blocks); }
    clearMultiBlockSelection();
    scheduleSave(); renderBlocks(currentPage());

    if(focusId && findBlock(focusId)){ focusBlock(focusId,focusOffset); return true; }
    if(Array.isArray(firstContainer) && firstContainer.length){
      const target=firstContainer[Math.min(firstIndex,firstContainer.length-1)] || firstContainer.at(-1);
      if(target?.id) focusBlock(target.id,0);
    }
    return true;
  }

  function onAuxClick(e){
    if (e.button !== 1) return;
    const tab=e.target.closest('.editor-tab[data-tab-id]');
    if(tab){ e.preventDefault(); closeTab(tab.dataset.tabId); return; }
    const pageRow=e.target.closest('.page-tree-row');
    if(pageRow && e.target.closest('[data-action="open-page"]')){ e.preventDefault(); openPage(pageRow.dataset.pageId,{newTab:true}); return; }
    const pageBlockLink=e.target.closest('[data-page-block-open]');
    if(pageBlockLink){ e.preventDefault(); openPage(pageBlockLink.dataset.pageBlockOpen,{newTab:true}); return; }
    const crumb=e.target.closest('[data-crumb-id]');
    if(crumb){ e.preventDefault(); openPage(crumb.dataset.crumbId,{newTab:true}); return; }
    const homeCard=e.target.closest('[data-home-page]');
    if(homeCard){ e.preventDefault(); openPage(homeCard.dataset.homePage,{newTab:true}); }
  }

  function onInput(e){
    if(e.target===els.pageTitle){ const p=currentPage(); p.title=e.target.innerText.replace(/\n/g,' ') || ''; scheduleSave('merge'); renderSidebar(); renderBreadcrumbs(p); renderTabs(); renderRightSidebar(); return; }
    if(e.target===els.commandSearch){ commandIndex=0; renderCommandResults(e.target.value); return; }
    if(e.target===els.slashSearch){ slashIndex=0; renderSlashResults(e.target.value); return; }
    if(e.target.matches('[data-icon-search]')){ renderIconPickerResults(e.target.value); return; }
    if(e.target.matches('[data-code-editor]')){ const row=e.target.closest('.code-block'), b=findBlock(row?.dataset.blockId); if(b){ b.text=e.target.value; scheduleSave('merge'); updateCodePreview(row,b,e.target); } return; }
    if(e.target.matches('[data-link-label]')){ const row=e.target.closest('.hyperlink-block'), b=findBlock(row?.dataset.blockId); if(b){ b.text=e.target.innerText.replace(/\n/g,' '); scheduleSave('merge'); } return; }
    if(e.target.matches('[data-link-url]')){ const row=e.target.closest('.hyperlink-block'), b=findBlock(row?.dataset.blockId); if(b){ b.url=e.target.value; scheduleSave('merge'); updateHyperlinkOpen(row,b); } return; }
    const content=e.target.closest('.block-content');
    if(content){
      const row=content.closest('.block-row'); const b=findBlock(row.dataset.blockId); if(!b) return;
      b.text=content.innerText.replace(/\n$/, ''); b.inlineLinks=inlineLinksFromContent(content,b.text); if(!b.inlineLinks.length) delete b.inlineLinks; content.dataset.empty=b.text.length?'false':'true'; scheduleSave('merge'); if(['h1','h2','h3'].includes(b.type)) renderRightSidebar();
      if(b.text.startsWith('/') && !b.text.includes('\n')){ showSlashMenu(row,b); hideEmojiMenu(); }
      else { if(activeSlashBlockId===b.id) hideSlashMenu(); updateEmojiMenu(content,b); }
      els.emptyHint.style.display='none';
      return;
    }
    if(e.target.matches('[data-link-label],[data-link-url]')){
      const row=e.target.closest('.hyperlink-block'), id=row?.dataset.blockId, b=findBlock(id);
      if(e.key==='Enter'){
        e.preventDefault();
        if(mod){ const href=normalizeHyperlinkUrl(b?.url); if(href) window.open(href,'_blank','noopener,noreferrer'); return; }
        if(e.target.matches('[data-link-label]')) row?.querySelector('[data-link-url]')?.focus();
        else { const normalized=normalizeHyperlinkUrl(e.target.value); if(b&&normalized){ b.url=normalized; e.target.value=normalized; scheduleSave(); updateHyperlinkOpen(row,b); } else if(b?.url) toast('Enter a valid URL'); }
        return;
      }
      if(e.key==='Escape'){ e.target.blur(); return; }
    }

    if(e.target.matches('[data-table-cell]')){
      const row=e.target.closest('.simple-table-block'), b=findBlock(row?.dataset.blockId); if(!b)return;
      normalizeSimpleTableBlock(b); const [ri,ci]=e.target.dataset.tableCell.split(':').map(Number);
      if(b.tableRows[ri]) b.tableRows[ri][ci]=e.target.innerText.replace(/\n$/,''); scheduleSave('merge'); return;
    }
    const imageCaption=e.target.closest('[data-image-caption]');
    if(imageCaption){ const row=imageCaption.closest('.image-block'); const b=findBlock(row.dataset.blockId); if(b){ b.caption=imageCaption.innerText.replace(/\n$/, ''); scheduleSave('merge'); } return; }
    const row=e.target.closest('.database-block');
    if(row){
      const b=findBlock(row.dataset.blockId); if(!b) return;
      if(e.target.matches('[data-db-title]')) b.title=e.target.innerText;
      if(e.target.matches('[data-db-col]')) b.columns[+e.target.dataset.dbCol]=e.target.innerText;
      if(e.target.matches('[data-db-cell]')){ const [ri,ci]=e.target.dataset.dbCell.split(':').map(Number); b.rows[ri][ci]=e.target.innerText; }
      scheduleSave('merge');
    }
  }

  function onChange(e){
    if(e.target.matches('[data-link-url]')){ const row=e.target.closest('.hyperlink-block'), b=findBlock(row?.dataset.blockId); if(b){ const normalized=normalizeHyperlinkUrl(e.target.value); if(normalized){ b.url=normalized; e.target.value=normalized; } else b.url=e.target.value.trim(); scheduleSave(); updateHyperlinkOpen(row,b); } return; }
    if(e.target.matches('[data-code-language]')){ const row=e.target.closest('.code-block'), b=findBlock(row?.dataset.blockId); if(b){ b.language=e.target.value; if(b.language==='mermaid' && typeof b.mermaidPreview!=='boolean') b.mermaidPreview=true; scheduleSave(); renderBlocks(currentPage()); focusCodeBlock(b.id); } return; }
    if(e.target.matches('[data-columns-count]')){ const row=e.target.closest('.columns-block'), b=findBlock(row?.dataset.blockId); if(b){ setColumnsCount(b,e.target.value); scheduleSave(); renderBlocks(currentPage()); } return; }
    if(e.target===els.vaultSelect){ switchVault(e.target.value); return; }
    if(e.target.matches('.todo-box')){ const row=e.target.closest('.block-row'); const b=findBlock(row.dataset.blockId); b.checked=e.target.checked; row.classList.toggle('checked',b.checked); scheduleSave(); }
    if(e.target===els.importFile && e.target.files[0]) importWorkspace(e.target.files[0]);
    if(e.target===els.imageFileInput && e.target.files[0]){ const id=activeImageBlockId; const file=e.target.files[0]; e.target.value=''; activeImageBlockId=null; if(id) loadImageFileIntoBlock(file,id); }
    if(e.target===els.pageIconFileInput && e.target.files[0]){ const file=e.target.files[0]; e.target.value=''; loadPageIconFile(file); }
  }

  function onKeyDown(e){
    const mod=e.ctrlKey||e.metaKey;
    if(tableCellSelection?.active){
      if(e.key==='Escape'){ e.preventDefault(); clearTableCellSelection(); return; }
      if(e.key==='Backspace'||e.key==='Delete'){ e.preventDefault(); clearSelectedTableCells(); return; }
    }
    if(selectedTableBlockId && e.key==='Escape'){ e.preventDefault(); clearSelectedTable(); document.activeElement?.blur?.(); return; }
    if(multiBlockSelection?.active){
      if(e.key==='Escape'){ e.preventDefault(); clearMultiBlockSelection(); return; }
      if(e.key==='Backspace'||e.key==='Delete'){ e.preventDefault(); deleteMultiBlockSelection(); return; }
    }
    if(e.target.matches?.('[data-external-icon-dropzone]') && (e.key==='Enter' || e.key===' ')){
      e.preventDefault(); els.pageIconFileInput?.click(); return;
    }
    if(els.vaultDialog && !els.vaultDialog.classList.contains('hidden')){
      if(e.key==='Enter' && e.target===els.vaultDialogInput){ e.preventDefault(); submitVaultDialog(); return; }
      if(e.key==='Escape'){ e.preventDefault(); closeVaultDialog(); return; }
    }
    if(e.target===els.pageTitle && e.key==='Enter'){
      e.preventDefault();
      const page=currentPage();
      if(!page) return;
      const block=newTextBlock();
      page.blocks.unshift(block);
      scheduleSave();
      renderBlocks(page);
      requestAnimationFrame(()=>focusBlock(block.id,0));
      return;
    }
    if(mod && !e.shiftKey && e.key.toLowerCase()==='z'){ e.preventDefault(); undoWorkspace(); return; }
    if(mod && ((e.shiftKey && e.key.toLowerCase()==='z') || e.key.toLowerCase()==='y')){ e.preventDefault(); redoWorkspace(); return; }
    if(mod && e.key==='Tab'){ e.preventDefault(); cycleTab(e.shiftKey?-1:1); return; }
    if(mod && e.key.toLowerCase()==='w' && state.activeTabId){ e.preventDefault(); closeTab(state.activeTabId); return; }
    if(mod && e.key.toLowerCase()==='k'){ e.preventDefault(); openCommandPalette(); return; }
    if(mod && e.shiftKey && e.key.toLowerCase()==='l'){ e.preventDefault(); cycleTheme(); return; }
    if(e.key==='Escape'){ hideFloatingMenus(); document.querySelectorAll('.modal-backdrop').forEach(m=>m.classList.add('hidden')); return; }

    if(!els.commandPalette.classList.contains('hidden')){
      const items=[...els.commandResults.querySelectorAll('[data-command]')];
      if(e.key==='ArrowDown'){ e.preventDefault(); commandIndex=Math.min(commandIndex+1,items.length-1); renderCommandSelection(); }
      if(e.key==='ArrowUp'){ e.preventDefault(); commandIndex=Math.max(commandIndex-1,0); renderCommandSelection(); }
      if(e.key==='Enter' && items[commandIndex]){ e.preventDefault(); items[commandIndex].click(); }
      return;
    }
    if(els.emojiMenu && !els.emojiMenu.classList.contains('hidden')){
      const items=[...els.emojiResults.querySelectorAll('[data-emoji-choice]')];
      if(e.key==='ArrowDown'){ e.preventDefault(); emojiIndex=Math.min(emojiIndex+8,Math.max(0,items.length-1)); renderEmojiSelection(); return; }
      if(e.key==='ArrowUp'){ e.preventDefault(); emojiIndex=Math.max(emojiIndex-8,0); renderEmojiSelection(); return; }
      if(e.key==='ArrowRight'){ e.preventDefault(); emojiIndex=Math.min(emojiIndex+1,Math.max(0,items.length-1)); renderEmojiSelection(); return; }
      if(e.key==='ArrowLeft'){ e.preventDefault(); emojiIndex=Math.max(emojiIndex-1,0); renderEmojiSelection(); return; }
      if((e.key==='Enter'||e.key==='Tab') && items[emojiIndex]){ e.preventDefault(); chooseEmoji(items[emojiIndex].dataset.emojiChoice); return; }
    }
    if(!els.slashMenu.classList.contains('hidden')){
      const items=[...els.slashResults.querySelectorAll('[data-slash-type]')];
      if(e.key==='ArrowDown'){ e.preventDefault(); slashIndex=Math.min(slashIndex+1,items.length-1); renderSlashSelection(); return; }
      if(e.key==='ArrowUp'){ e.preventDefault(); slashIndex=Math.max(slashIndex-1,0); renderSlashSelection(); return; }
      if(e.key==='Enter' && items[slashIndex]){ e.preventDefault(); items[slashIndex].click(); return; }
    }

    if(e.target.matches('[data-table-cell]')){
      const cell=e.target, row=cell.closest('.simple-table-block'), id=row?.dataset.blockId, b=findBlock(id);
      if(e.key==='Tab' && b){
        e.preventDefault(); normalizeSimpleTableBlock(b);
        const cells=[...row.querySelectorAll('[data-table-cell]')], current=cells.indexOf(cell);
        if(!e.shiftKey && current===cells.length-1){ b.tableRows.push(Array(b.tableRows[0].length).fill('')); scheduleSave(); renderBlocks(currentPage()); requestAnimationFrame(()=>document.querySelector(`.simple-table-block[data-block-id="${id}"] [data-table-cell="${b.tableRows.length-1}:0"]`)?.focus()); return; }
        const next=cells[current+(e.shiftKey?-1:1)]; next?.focus(); return;
      }
      if(mod && e.key==='Enter'){ e.preventDefault(); addBlockAfter(id); return; }
      return;
    }

    if(e.target.matches('[data-code-editor]')){
      const input=e.target, row=input.closest('.code-block'), id=row?.dataset.blockId;
      if(e.key==='Tab'){
        e.preventDefault(); const start=input.selectionStart,end=input.selectionEnd,value=input.value;
        if(e.shiftKey){ const lineStart=value.lastIndexOf('\n',start-1)+1, removable=value.slice(lineStart,lineStart+2).match(/^ {1,2}/)?.[0]||''; if(removable){ input.value=value.slice(0,lineStart)+value.slice(lineStart+removable.length); input.selectionStart=input.selectionEnd=Math.max(lineStart,start-removable.length); } }
        else { input.value=value.slice(0,start)+'  '+value.slice(end); input.selectionStart=input.selectionEnd=start+2; }
        input.dispatchEvent(new Event('input',{bubbles:true})); return;
      }
      if(mod && e.key==='Enter'){ e.preventDefault(); addBlockAfter(id); return; }
      return;
    }

    if(e.target.matches('[data-image-url-input]')){
      const row=e.target.closest('.block-row');
      if(e.key==='Enter'){ e.preventDefault(); commitImageUrl(row.dataset.blockId,e.target); }
      if(e.key==='Escape'){ e.preventDefault(); activeImageLinkBlockId=null; renderBlocks(currentPage()); }
      return;
    }

    if(e.target.matches('[data-custom-icon-input]') && e.key==='Enter'){ e.preventDefault(); const value=e.target.value.trim(); if(value)setPageIcon(value.slice(0,12)); return; }
    if(e.target.matches('[data-external-icon-url]') && e.key==='Enter'){ e.preventDefault(); applyExternalIconUrl(e.target.value); return; }
    if(e.target.matches('[data-comment-input]') && (e.ctrlKey||e.metaKey) && e.key==='Enter'){ e.preventDefault(); addPageComment(); return; }

    const content=e.target.closest('.block-content'); if(!content) return;
    const row=content.closest('.block-row'), id=row.dataset.blockId, location=findBlockLocation(id), b=location?.block, page=currentPage();
    if(!location||!b)return;
    const blocks=location.blocks, index=location.index;
    if(e.key===' ' && !e.ctrlKey && !e.metaKey && !e.altKey && b.type==='text'){
      const marker=content.innerText.replace(/\n$/, '');
      const selection=window.getSelection();
      const caret=getCaretOffset(content);
      const selectionCollapsed=!selection?.rangeCount || selection.isCollapsed;
      let shortcutType=null;
      if(selectionCollapsed && caret===marker.length){
        if(marker==='*' || marker==='-' || marker==='+') shortcutType='bullet';
        else if(marker==='1.' || marker==='1)') shortcutType='number';
      }
      if(shortcutType){
        e.preventDefault();
        b.type=shortcutType;
        b.text='';
        delete b.indent;
        hideFloatingMenus();
        scheduleSave();
        renderBlocks(page);
        focusBlock(b.id,0);
        return;
      }
    }
    if(e.key==='Tab' && isListBlock(b)){
      e.preventDefault();
      const caret=getCaretOffset(content);
      if(changeListIndent(blocks,index,e.shiftKey?-1:1)){
        hideFloatingMenus();
        scheduleSave();
        renderBlocks(page);
        focusBlock(b.id,caret);
      }
      return;
    }
    if(e.key==='Enter' && !e.shiftKey){
      e.preventDefault();
      if(b.type==='database') return;
      if(b.type==='todo' && !(b.text||'').trim()){
        b.type='text';
        b.text='';
        delete b.checked;
        delete b.indent;
        delete b.inlineLinks;
        hideFloatingMenus();
        scheduleSave();
        renderBlocks(page);
        focusBlock(b.id,0);
        return;
      }
      const sel=window.getSelection(); const caret=getCaretOffset(content);
      const text=b.text||'', linkSplit=splitInlineLinksAt(b,caret); const left=text.slice(0,caret), right=text.slice(caret);
      b.text=left; b.inlineLinks=normalizeInlineLinkRanges(linkSplit.left,left.length); if(!b.inlineLinks.length) delete b.inlineLinks;
      const nextType=['bullet','number','todo','toggle'].includes(b.type) ? b.type : 'text';
      const nb={id:uid('b'),type:nextType,text:right}; if(isListBlock(nb)) setListIndentLevel(nb,listIndentLevel(b)); const nextLinks=normalizeInlineLinkRanges(linkSplit.right,right.length); if(nextLinks.length) nb.inlineLinks=nextLinks; if(nextType==='todo') nb.checked=false;
      blocks.splice(index+1,0,nb); scheduleSave(); renderBlocks(page); focusBlock(nb.id,0); return;
    }
    if(e.key==='Backspace' && (b.text||'')==='' && isListBlock(b)){
      e.preventDefault();
      if(listIndentLevel(b)>0) changeListIndent(blocks,index,-1);
      else { b.type='text'; delete b.indent; }
      scheduleSave();
      renderBlocks(page);
      focusBlock(b.id,0);
      return;
    }
    if(e.key==='Backspace' && (b.text||'')==='' && index>0){
      e.preventDefault(); const prev=blocks[index-1]; blocks.splice(index,1); scheduleSave(); renderBlocks(page);
      if(isTextLikeBlock(prev)) focusBlock(prev.id,(prev.text||'').length); return;
    }
    if(e.key==='Backspace' && getCaretOffset(content)===0 && index>0){
      const prev=blocks[index-1];
      if(isTextLikeBlock(prev)){
        e.preventDefault(); const pos=(prev.text||'').length, mergedLinks=[...inlineLinksForBlock(prev),...inlineLinksForBlock(b).map(link=>({start:link.start+pos,end:link.end+pos,url:link.url}))]; prev.text=(prev.text||'')+(b.text||''); prev.inlineLinks=normalizeInlineLinkRanges(mergedLinks,prev.text.length); if(!prev.inlineLinks.length) delete prev.inlineLinks; blocks.splice(index,1); scheduleSave(); renderBlocks(page); focusBlock(prev.id,pos);
      }
    }
    if(mod && e.shiftKey){
      const map={'1':'h1','2':'h2','3':'h3','7':'number','8':'bullet','9':'todo'};
      if(map[e.key]){ e.preventDefault(); const wasList=isListBlock(b); b.type=map[e.key]; if(!isListBlock(b) || !wasList) delete b.indent; scheduleSave(); renderBlocks(page); focusBlock(b.id,(b.text||'').length); }
    }
  }

  function onDragStart(e){
    const tableHandle=e.target.closest?.('.table-axis-handle[draggable="true"]');
    if(tableHandle){
      const tableBlock=tableHandle.closest('.simple-table-block[data-block-id]');
      const blockId=tableBlock?.dataset.blockId;
      const rowIndex=tableHandle.dataset.tableRowMenu;
      const colIndex=tableHandle.dataset.tableColMenu;
      const axis=rowIndex!==undefined?'row':(colIndex!==undefined?'col':null);
      const index=Number(axis==='row'?rowIndex:colIndex);
      if(blockId && axis && Number.isInteger(index)){
        tableAxisDrag={blockId,axis,index,targetIndex:index,after:false};
        clearTableCellSelection();
        clearSelectedTable();
        if(axis==='row') tableHandle.closest('tr[data-table-row]')?.classList.add('table-row-dragging');
        else markTableColumnDragState(tableBlock,index,'table-col-dragging');
        if(e.dataTransfer){
          e.dataTransfer.effectAllowed='move';
          e.dataTransfer.setData('text/plain',`table-${axis}:${blockId}:${index}`);
        }
        return;
      }
    }
    const tab=e.target.closest('.editor-tab[data-tab-id]');
    if(tab && !e.target.closest('.tab-close')){
      dragTabId=tab.dataset.tabId; tab.classList.add('dragging');
      e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/plain',`tab:${dragTabId}`); return;
    }
    const handle=e.target.closest('[data-block-action="drag"]'); if(!handle) return;
    const row=handle.closest('.block-row'); dragBlockId=row.dataset.blockId; row.classList.add('dragging');
    e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/plain',dragBlockId);
  }
  function onDragOver(e){
    if(tableAxisDrag){
      const tableBlock=e.target.closest?.(`.simple-table-block[data-block-id="${tableAxisDrag.blockId}"]`);
      if(!tableBlock) return;
      const target=tableAxisDropTarget(e,tableBlock,tableAxisDrag.axis);
      if(!target) return;
      e.preventDefault();
      e.stopPropagation();
      if(e.dataTransfer) e.dataTransfer.dropEffect='move';
      tableAxisDrag.targetIndex=target.index;
      tableAxisDrag.after=target.after;
      renderTableAxisDropIndicator(tableBlock,tableAxisDrag.axis,target.index,target.after);
      return;
    }
    const iconDrop=!dragTabId && !dragBlockId ? e.target.closest?.('[data-external-icon-dropzone]') : null;
    if(iconDrop && externalIconPaneActive()){
      e.preventDefault();
      if(e.dataTransfer)e.dataTransfer.dropEffect='copy';
      iconDrop.classList.add('drag-over');
      return;
    }
    clearExternalIconDropState();
    if(dragTabId){
      const strip=e.target.closest('.tabs-scroll'); if(!strip) return; e.preventDefault();
      document.querySelectorAll('.tab-drop-before,.tab-drop-after').forEach(x=>x.classList.remove('tab-drop-before','tab-drop-after'));
      const tab=e.target.closest('.editor-tab[data-tab-id]');
      if(tab && tab.dataset.tabId!==dragTabId){ const r=tab.getBoundingClientRect(); tab.classList.add(e.clientX<r.left+r.width/2?'tab-drop-before':'tab-drop-after'); }
      return;
    }
    if(!dragBlockId) return;
    document.querySelectorAll('.drop-before,.drop-after,.column-drop-target').forEach(x=>x.classList.remove('drop-before','drop-after','column-drop-target'));
    const pane=e.target.closest('.column-pane');
    let row=e.target.closest('.block-row');
    // When the pointer is on empty column space, closest() reaches the outer Columns block.
    // Treat that as a column drop instead of moving the child outside the layout.
    if(pane && row?.classList.contains('columns-block')) row=null;
    if(row && row.dataset.blockId!==dragBlockId){
      e.preventDefault();
      const r=row.getBoundingClientRect(); row.classList.add(e.clientY<r.top+r.height/2?'drop-before':'drop-after');
      return;
    }
    if(pane){ e.preventDefault(); pane.classList.add('column-drop-target'); }
  }
  function onDrop(e){
    if(tableAxisDrag){
      const drag={...tableAxisDrag};
      const tableBlock=e.target.closest?.(`.simple-table-block[data-block-id="${drag.blockId}"]`);
      if(!tableBlock) return clearDragState();
      const target=tableAxisDropTarget(e,tableBlock,drag.axis) || {index:drag.targetIndex,after:drag.after};
      e.preventDefault();
      e.stopPropagation();
      const block=findBlock(drag.blockId);
      if(block?.type==='table'){
        const finalIndex=reorderSimpleTableAxis(block,drag.axis,drag.index,target.index,target.after);
        if(finalIndex!==null){
          scheduleSave();
          renderBlocks(currentPage());
          requestAnimationFrame(()=>{
            const selector=drag.axis==='row'
              ? `.simple-table-block[data-block-id="${drag.blockId}"] [data-table-row-menu="${finalIndex}"]`
              : `.simple-table-block[data-block-id="${drag.blockId}"] [data-table-col-menu="${finalIndex}"]`;
            document.querySelector(selector)?.focus();
          });
        }
      }
      clearDragState();
      return;
    }
    const iconDrop=!dragTabId && !dragBlockId ? e.target.closest?.('[data-external-icon-dropzone]') : null;
    if(iconDrop && externalIconPaneActive()){
      e.preventDefault(); e.stopPropagation(); clearExternalIconDropState();
      if(!applyExternalIconTransfer(e.dataTransfer)) toast('Drop an image file or image URL');
      return;
    }
    clearExternalIconDropState();
    if(dragTabId){
      const strip=e.target.closest('.tabs-scroll'); if(!strip) return clearDragState(); e.preventDefault();
      const tabs=state.openTabs||[], from=tabs.findIndex(t=>t.id===dragTabId); if(from<0) return clearDragState();
      const target=e.target.closest('.editor-tab[data-tab-id]');
      let to=tabs.length;
      if(target){ const targetIndex=tabs.findIndex(t=>t.id===target.dataset.tabId); const r=target.getBoundingClientRect(); to=targetIndex+(e.clientX>=r.left+r.width/2?1:0); }
      const [moved]=tabs.splice(from,1); if(from<to) to--; tabs.splice(Math.max(0,Math.min(to,tabs.length)),0,moved);
      scheduleSave(); renderTabs(); clearDragState(); return;
    }
    if(!dragBlockId) return;
    e.preventDefault();

    const page=currentPage(); if(!page) return clearDragState();
    const movedId=dragBlockId;
    const fromLoc=findBlockLocation(movedId); if(!fromLoc) return clearDragState();

    const pane=e.target.closest('.column-pane');
    let targetRow=e.target.closest('.block-row');
    if(pane && targetRow?.classList.contains('columns-block')) targetRow=null;
    if(targetRow?.dataset.blockId===movedId) return clearDragState();

    const targetId=targetRow?.dataset.blockId||null;
    const targetColumnId=!targetId ? pane?.dataset.columnId||null : null;
    if(!targetId && !targetColumnId) return clearDragState();
    if(targetId && blockContainsId(fromLoc.block,targetId)) return clearDragState();
    if(targetColumnId){
      const owner=findColumnLocation(targetColumnId);
      if(!owner || blockContainsId(fromLoc.block,owner.parentBlock?.id)) return clearDragState();
    }

    const insertAfter=!!targetRow && e.clientY>=targetRow.getBoundingClientRect().top+targetRow.getBoundingClientRect().height/2;
    const emptiedLists=new Set();
    const holder={block:null};
    removeBlockOccurrences(movedId,page.blocks,holder,emptiedLists);
    const moved=holder.block||fromLoc.block;
    if(!moved) return clearDragState();

    let destination=null, to=0;
    if(targetId){
      const toLoc=findBlockLocation(targetId);
      if(!toLoc){
        // Defensive fallback: restore the block to its original list if the target disappeared.
        fromLoc.blocks.splice(Math.min(fromLoc.index,fromLoc.blocks.length),0,moved);
        clearDragState(); return;
      }
      destination=toLoc.blocks;
      to=toLoc.index+(insertAfter?1:0);
    } else {
      const colLoc=findColumnLocation(targetColumnId);
      if(!colLoc){
        fromLoc.blocks.splice(Math.min(fromLoc.index,fromLoc.blocks.length),0,moved);
        clearDragState(); return;
      }
      destination=colLoc.column.blocks;
      // Empty columns contain a placeholder text block. Replace it when a real block is dropped.
      if(destination.length===1 && destination[0].type==='text' && !(destination[0].text||'')) destination.length=0;
      to=destination.length;
    }

    // removeBlockOccurrences() above already detached every stale copy of this id,
    // so the block is inserted exactly once at its destination.
    to=Math.max(0,Math.min(to,destination.length));
    destination.splice(to,0,moved);
    for(const list of emptiedLists){ if(list!==destination && !list.length) list.push(newTextBlock()); }
    if(!page.blocks.length) page.blocks.push(newTextBlock());

    scheduleSave(); renderBlocks(page); clearDragState();
  }
  function clearTableAxisDropIndicators(){
    document.querySelectorAll('.table-row-dragging,.table-row-drop-before,.table-row-drop-after,.table-col-dragging,.table-col-drop-before,.table-col-drop-after').forEach(el=>el.classList.remove('table-row-dragging','table-row-drop-before','table-row-drop-after','table-col-dragging','table-col-drop-before','table-col-drop-after'));
  }

  function markTableColumnDragState(tableBlock,index,className){
    tableBlock?.querySelector?.(`[data-table-col-control="${index}"]`)?.classList.add(className);
    tableBlock?.querySelectorAll?.(`[data-table-column="${index}"]`).forEach(cell=>cell.classList.add(className));
  }

  function renderTableAxisDropIndicator(tableBlock,axis,index,after){
    clearTableAxisDropIndicators();
    if(!tableAxisDrag) return;
    if(axis==='row'){
      tableBlock.querySelector(`tr[data-table-row="${index}"]`)?.classList.add(after?'table-row-drop-after':'table-row-drop-before');
      tableBlock.querySelector(`tr[data-table-row="${tableAxisDrag.index}"]`)?.classList.add('table-row-dragging');
    }else{
      markTableColumnDragState(tableBlock,index,after?'table-col-drop-after':'table-col-drop-before');
      markTableColumnDragState(tableBlock,tableAxisDrag.index,'table-col-dragging');
    }
  }

  function tableAxisDropTarget(e,tableBlock,axis){
    if(axis==='row'){
      const row=e.target.closest?.('tr[data-table-row]');
      if(!row || !tableBlock.contains(row)) return null;
      const index=Number(row.dataset.tableRow);
      if(!Number.isInteger(index)) return null;
      const rect=row.getBoundingClientRect();
      return {index,after:e.clientY>=rect.top+rect.height/2};
    }
    let index=null, rect=null;
    const control=e.target.closest?.('[data-table-col-control]');
    if(control && tableBlock.contains(control)){
      index=Number(control.dataset.tableColControl);
      rect=control.getBoundingClientRect();
    }else{
      const cell=e.target.closest?.('[data-table-column]');
      if(cell && tableBlock.contains(cell)){
        index=Number(cell.dataset.tableColumn);
        rect=cell.getBoundingClientRect();
      }
    }
    if(!Number.isInteger(index) || !rect) return null;
    return {index,after:e.clientX>=rect.left+rect.width/2};
  }

  function reorderSimpleTableAxis(block,axis,fromIndex,targetIndex,after){
    normalizeSimpleTableBlock(block);
    const rows=block.tableRows;
    if(axis==='row'){
      if(rows.length<2) return fromIndex;
      const from=Math.max(0,Math.min(rows.length-1,fromIndex));
      let insertAt=Math.max(0,Math.min(rows.length,targetIndex+(after?1:0)));
      const [moved]=rows.splice(from,1);
      if(from<insertAt) insertAt--;
      insertAt=Math.max(0,Math.min(rows.length,insertAt));
      rows.splice(insertAt,0,moved);
      clearTableCellSelection();
      return insertAt;
    }
    const count=rows[0]?.length||1;
    if(count<2) return fromIndex;
    const from=Math.max(0,Math.min(count-1,fromIndex));
    let insertAt=Math.max(0,Math.min(count,targetIndex+(after?1:0)));
    if(from<insertAt) insertAt--;
    insertAt=Math.max(0,Math.min(count-1,insertAt));
    if(insertAt===from) return from;
    for(const row of rows){
      const [moved]=row.splice(from,1);
      row.splice(insertAt,0,moved);
    }
    clearTableCellSelection();
    return insertAt;
  }

  function clearDragState(){
    dragBlockId=null; dragTabId=null; tableAxisDrag=null;
    clearTableAxisDropIndicators();
    document.querySelectorAll('.dragging,.drop-before,.drop-after,.column-drop-target,.tab-drop-before,.tab-drop-after').forEach(x=>x.classList.remove('dragging','drop-before','drop-after','column-drop-target','tab-drop-before','tab-drop-after'));
  }

  function createSubpageForBlock(parentId){
    const page={id:uid('page'),parentId,title:'Untitled',icon:'📄',favorite:false,expanded:true,blocks:[newTextBlock()]};
    state.pages.push(page);
    const parent=pageById(parentId); if(parent) parent.expanded=true;
    return page;
  }

  function createPage(parentId=null){
    const page={id:uid('page'),parentId,title:'Untitled',icon:'📄',favorite:false,expanded:true,blocks:[newTextBlock()]};
    state.pages.push(page); if(parentId){ const parent=pageById(parentId); if(parent) parent.expanded=true; }
    createTab(page.id,true); scheduleSave(); renderAll(); setTimeout(()=>{ els.pageTitle.focus(); selectAllContent(els.pageTitle); },0);
  }

  function deletePage(id){
    const ids=new Set([id]); let changed=true; while(changed){ changed=false; for(const p of state.pages){ if(p.parentId&&ids.has(p.parentId)&&!ids.has(p.id)){ids.add(p.id); changed=true;} } }
    if(ids.has(state.currentPageId)) cancelPageOperations();
    state.pages=state.pages.filter(p=>!ids.has(p.id));
    state.openTabs=(state.openTabs||[]).filter(tab=>!ids.has(tab.pageId));
    if(!(state.openTabs||[]).some(tab=>tab.id===state.activeTabId)) state.activeTabId=null;
    if(ids.has(state.currentPageId)){ const next=state.openTabs.at(-1)||null; state.activeTabId=next?.id||null; state.currentPageId=next?.pageId||state.pages[0]?.id||'__home__'; }
    scheduleSave(); renderAll(); toast('Page moved to trash');
  }

  function duplicatePage(id){
    const p=pageById(id); if(!p)return; const cp=clone(p); cp.id=uid('page'); cp.title=`${p.title} copy`; cp.blocks=cp.blocks.map(cloneBlockWithNewIds); cp.favorite=false; state.pages.push(cp); openPage(cp.id); toast('Page duplicated');
  }

  function openPage(id,{newTab=false}={}){ if(!pageById(id))return; if(newTab)createTab(id,true); else replaceActiveTab(id); scheduleSave(); renderAll(); }

  function newTextBlock(){ return {id:uid('b'),type:'text',text:''}; }
  function findBlockLocation(id,blocks=currentPage()?.blocks||[],parentBlock=null,column=null){
    for(let i=0;i<blocks.length;i++){
      const block=blocks[i];
      if(block?.id===id) return {block,blocks,index:i,parentBlock,column};
      if(block?.type==='columns'){
        normalizeColumnsBlock(block);
        for(const col of block.columns){ const found=findBlockLocation(id,col.blocks,block,col); if(found)return found; }
      }
    }
    return null;
  }
  function findColumnLocation(id,blocks=currentPage()?.blocks||[]){
    for(const block of blocks||[]){
      if(block?.type!=='columns') continue;
      normalizeColumnsBlock(block);
      for(const col of block.columns){
        if(col.id===id) return {column:col,parentBlock:block};
        const nested=findColumnLocation(id,col.blocks);
        if(nested) return nested;
      }
    }
    return null;
  }
  function removeBlockOccurrences(id,blocks,holder={block:null},emptiedLists=new Set()){
    if(!Array.isArray(blocks)) return holder.block;
    for(let i=blocks.length-1;i>=0;i--){
      const block=blocks[i];
      if(block?.id===id){
        if(!holder.block) holder.block=block;
        blocks.splice(i,1);
        continue;
      }
      if(block?.type==='columns'){
        normalizeColumnsBlock(block);
        for(const col of block.columns) removeBlockOccurrences(id,col.blocks,holder,emptiedLists);
      }
    }
    if(!blocks.length) emptiedLists.add(blocks);
    return holder.block;
  }
  function findBlock(id){ return findBlockLocation(id)?.block||null; }
  function isTextLikeBlock(block){ return !!block && ['text','h1','h2','h3','bullet','number','todo','toggle','quote','callout'].includes(block.type); }
  function ensureBlockList(blocks){ if(Array.isArray(blocks)&&!blocks.length) blocks.push(newTextBlock()); }
  function addBlockAfter(id){ const page=currentPage(), loc=findBlockLocation(id); if(!loc)return; const b=newTextBlock(); loc.blocks.splice(loc.index+1,0,b); scheduleSave(); renderBlocks(page); focusBlock(b.id,0); }
  function cloneBlockWithNewIds(block){
    const cp=clone(block); cp.id=uid('b');
    if(cp.type==='columns' && Array.isArray(cp.columns)) cp.columns=cp.columns.map(col=>({id:uid('col'),blocks:(col.blocks||[]).map(cloneBlockWithNewIds)}));
    return cp;
  }
  function blockContainsId(block,id){
    if(!block)return false; if(block.id===id)return true;
    if(block.type==='columns') return (block.columns||[]).some(col=>(col.blocks||[]).some(child=>blockContainsId(child,id)));
    return false;
  }
  function blockTextFallback(block){
    if(!block)return '';
    if(block.type==='table') return (block.tableRows||[]).flat().filter(Boolean).join(' ');
    if(block.type==='columns') return flattenBlocks((block.columns||[]).flatMap(c=>c.blocks||[])).map(b=>b.text||b.caption||b.url||'').filter(Boolean).join(' ');
    if(block.type==='link') return block.text||block.url||'';
    const linked=block.pageId?pageById(block.pageId):null;
    return block.text||block.caption||block.title||linked?.title||'';
  }

  function chooseImageFile(id){ activeImageBlockId=id; els.imageFileInput.value=''; els.imageFileInput.click(); }
  function openImageUrlEditor(id){
    activeImageLinkBlockId=id;
    renderBlocks(currentPage());
    requestAnimationFrame(()=>{ const input=document.querySelector(`.block-row[data-block-id="${id}"] [data-image-url-input]`); input?.focus(); input?.select(); });
  }
  function commitImageUrl(id,input){
    const b=findBlock(id); if(!b||!input)return;
    const operationEpoch=pageOperationEpoch, pageId=state.currentPageId;
    const editor=input.closest('[data-image-url-editor]');
    const error=editor?.querySelector('[data-image-url-error]');
    const url=normalizeImageUrl(input.value);
    if(!url){ if(error) error.textContent='Enter a valid http:// or https:// image URL.'; input.focus(); return; }
    if(error) error.textContent='';
    editor?.classList.add('loading');
    const probe=new Image();
    let finished=false;
    const done=(ok)=>{
      if(finished)return; finished=true; clearTimeout(timer);
      if(operationEpoch!==pageOperationEpoch || state.currentPageId!==pageId) return;
      editor?.classList.remove('loading');
      if(!ok){ if(error) error.textContent='This URL could not be loaded as an image. Try a direct public .jpg, .png, .webp, .gif, or other image URL.'; input.focus(); return; }
      const current=findBlock(id); if(!current)return;
      current.src=url; current.alt=current.alt||imageAltFromUrl(url); activeImageLinkBlockId=null; scheduleSave(); renderBlocks(currentPage()); toast('Image embedded');
    };
    probe.onload=()=>done(true);
    probe.onerror=()=>done(false);
    const timer=setTimeout(()=>done(false),10000);
    probe.src=url;
  }
  function normalizeImageUrl(value){
    let raw=String(value||'').trim(); if(!raw)return '';
    if(/^data:image\//i.test(raw)) return raw;
    if(/^\/\//.test(raw)) raw='https:'+raw;
    if(!/^[a-z][a-z0-9+.-]*:/i.test(raw) && /^[^\s/]+\.[^\s/]+/.test(raw)) raw='https://'+raw;
    try{
      const u=new URL(raw);
      if(!['http:','https:'].includes(u.protocol)) return '';
      // Common share-link forms that otherwise return an HTML page instead of image bytes.
      if(u.hostname==='www.dropbox.com' || u.hostname==='dropbox.com'){ u.searchParams.delete('dl'); u.searchParams.set('raw','1'); }
      const drive=u.hostname==='drive.google.com' && u.pathname.match(/^\/file\/d\/([^/]+)/);
      if(drive) return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(drive[1])}`;
      return u.href;
    }catch{}
    return '';
  }
  function imageAltFromUrl(url){
    try{ const name=new URL(url).pathname.split('/').filter(Boolean).pop()||'Image'; return decodeURIComponent(name).replace(/\.[a-z0-9]+$/i,'')||'Image'; }catch{ return 'Image'; }
  }
  function loadImageFileIntoBlock(file,id){
    if(!file?.type?.startsWith('image/')){ toast('That file is not an image.'); return; }
    if(file.size > 2.5*1024*1024){ toast('Use an image smaller than 2.5 MB for local persistence.'); return; }
    const operationEpoch=pageOperationEpoch, pageId=state.currentPageId;
    const reader=new FileReader();
    reader.onload=()=>{ if(operationEpoch!==pageOperationEpoch || state.currentPageId!==pageId)return; const b=findBlock(id); if(!b)return; b.type='image'; b.src=String(reader.result); b.alt=file.name.replace(/\.[^.]+$/,''); b.caption=b.caption||''; delete b.text; scheduleSave(); renderBlocks(currentPage()); };
    reader.onerror=()=>toast('Could not read that image.');
    reader.readAsDataURL(file);
  }
  function normalizeMarkdownCodeLanguage(value){
    const raw=String(value||'').trim().toLowerCase().replace(/^\{\.?|\}$/g,'');
    const aliases={
      js:'javascript',jsx:'javascript',node:'javascript',ts:'typescript',tsx:'typescript',
      sh:'bash',shell:'bash',zsh:'bash',powershell:'bash',ps1:'bash',
      py:'python',cs:'csharp','c#':'csharp',dotnet:'csharp',
      c:'cpp','c++':'cpp',cc:'cpp',h:'cpp',hpp:'cpp',
      rs:'rust',golang:'go',html5:'html',htm:'html',
      yml:'yaml',md:'markdown',mdown:'markdown',mmd:'mermaid',
      txt:'plain',text:'plain',plaintext:'plain'
    };
    const language=aliases[raw]||raw||'plain';
    return CODE_LANGUAGES.some(([id])=>id===language)?language:'plain';
  }

  function markdownInlineText(value){
    let text=String(value||'');
    text=text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g,(_,alt,url)=>alt?`${alt} (${url})`:url);
    text=text.replace(/\[([^\]]+)\]\(([^)]+)\)/g,(_,label,url)=>`${label} (${url})`);
    text=text.replace(/<((?:https?:\/\/|mailto:)[^>]+)>/gi,'$1');
    text=text.replace(/(`{1,2})(.*?)\1/g,'$2');
    text=text.replace(/(\*\*|__)(.*?)\1/g,'$2');
    text=text.replace(/~~(.*?)~~/g,'$1');
    text=text.replace(/(^|[^*])\*([^*\n]+)\*/g,'$1$2');
    text=text.replace(/(^|[^_])_([^_\n]+)_/g,'$1$2');
    text=text.replace(/\\([\\`*_[\]{}()#+\-.!>])/g,'$1');
    return text.trim();
  }

  function splitMarkdownTableRow(line){
    let source=String(line||'').trim();
    if(source.startsWith('|')) source=source.slice(1);
    if(source.endsWith('|') && !source.endsWith('\\|')) source=source.slice(0,-1);
    const cells=[]; let current=''; let escaped=false;
    for(const ch of source){
      if(escaped){ current+=ch; escaped=false; continue; }
      if(ch==='\\'){ escaped=true; current+=ch; continue; }
      if(ch==='|'){ cells.push(markdownInlineText(current.trim())); current=''; continue; }
      current+=ch;
    }
    cells.push(markdownInlineText(current.trim()));
    return cells;
  }

  function isMarkdownTableSeparator(line){
    const cells=splitMarkdownTableRow(line);
    return cells.length>1 && cells.every(cell=>/^:?-{3,}:?$/.test(cell.replace(/\s+/g,'')));
  }

  function looksLikeMarkdown(text){
    const source=String(text||'').replace(/\r\n?/g,'\n');
    if(!source.trim()) return false;
    return /(^|\n)\s{0,3}(#{1,6})\s+\S/.test(source)
      || /(^|\n)\s{0,3}(```|~~~)/.test(source)
      || /(^|\n)\s{0,3}[-+*]\s+(?:\[[ xX]\]\s+)?\S/.test(source)
      || /(^|\n)\s{0,3}\d+[.)]\s+\S/.test(source)
      || /(^|\n)\s{0,3}>\s?\S/.test(source)
      || /(^|\n)\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*(?:\n|$)/.test(source)
      || /!\[[^\]]*\]\([^)]+\)/.test(source)
      || /^\s*\[[^\]]+\]\([^)]+\)\s*$/m.test(source)
      || /(^|\n)\s*\|?.+\|.+\n\s*\|?\s*:?-{3,}:?\s*\|/.test(source);
  }

  function parseMarkdownBlocks(markdown){
    const lines=String(markdown||'').replace(/\r\n?/g,'\n').split('\n');
    const blocks=[];
    const pushText=(type,text,extra={})=>{
      const cleaned=markdownInlineText(text);
      if(!cleaned && type!=='text') return;
      blocks.push({id:uid('b'),type,text:cleaned,...extra});
    };
    let i=0;
    while(i<lines.length){
      const line=lines[i];
      const trimmed=line.trim();
      if(!trimmed){ i++; continue; }

      const fence=line.match(/^\s{0,3}(```|~~~)\s*([^\s`]*)\s*$/);
      if(fence){
        const marker=fence[1], language=normalizeMarkdownCodeLanguage(fence[2]);
        const body=[]; i++;
        while(i<lines.length && !new RegExp(`^\\s{0,3}${marker[0]}{3,}\\s*$`).test(lines[i])) body.push(lines[i++]);
        if(i<lines.length) i++;
        blocks.push({id:uid('b'),type:'code',text:body.join('\n'),language,codeWrap:false,codeLineNumbers:false,mermaidPreview:language==='mermaid'});
        continue;
      }

      if(i+1<lines.length && line.includes('|') && isMarkdownTableSeparator(lines[i+1])){
        const rows=[splitMarkdownTableRow(line)]; i+=2;
        while(i<lines.length && lines[i].trim() && lines[i].includes('|')) rows.push(splitMarkdownTableRow(lines[i++]));
        const columns=Math.max(1,...rows.map(row=>row.length));
        const normalized=rows.map(row=>{ const cells=row.slice(); while(cells.length<columns)cells.push(''); return cells.slice(0,columns); });
        blocks.push({id:uid('b'),type:'table',tableRows:normalized,tableHeaderRow:true,tableHeaderColumn:false});
        continue;
      }

      if(/^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)){
        blocks.push({id:uid('b'),type:'divider'}); i++; continue;
      }

      const heading=line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
      if(heading){
        const level=Math.min(3,heading[1].length);
        pushText(`h${level}`,heading[2]); i++; continue;
      }

      const todo=line.match(/^\s*[-+*]\s+\[([ xX])\]\s+(.*)$/);
      if(todo){ pushText('todo',todo[2],{checked:todo[1].toLowerCase()==='x'}); i++; continue; }

      const bullet=line.match(/^(\s*)[-+*]\s+(.*)$/);
      if(bullet){ const indent=Math.min(8,Math.floor(bullet[1].replace(/\t/g,'  ').length/2)); pushText('bullet',bullet[2],indent?{indent}:{}); i++; continue; }

      const number=line.match(/^(\s*)\d+[.)]\s+(.*)$/);
      if(number){ const indent=Math.min(8,Math.floor(number[1].replace(/\t/g,'  ').length/2)); pushText('number',number[2],indent?{indent}:{}); i++; continue; }

      if(/^\s*>/.test(line)){
        const quoteLines=[];
        while(i<lines.length && /^\s*>/.test(lines[i])) quoteLines.push(lines[i++].replace(/^\s*>\s?/,''));
        const first=quoteLines[0]?.match(/^\[!([A-Za-z]+)\]\s*(.*)$/);
        if(first){
          const body=[first[2],...quoteLines.slice(1)].filter(Boolean).join('\n');
          pushText('callout',`${first[1][0].toUpperCase()+first[1].slice(1).toLowerCase()}: ${body}`);
        }else pushText('quote',quoteLines.join('\n'));
        continue;
      }

      const image=line.match(/^\s*!\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)\s*$/);
      if(image){
        const src=normalizeImageUrl(image[2]);
        if(src){ blocks.push({id:uid('b'),type:'image',src,caption:'',alt:markdownInlineText(image[1])}); i++; continue; }
      }

      const link=line.match(/^\s*\[([^\]]+)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)\s*$/);
      if(link){
        const url=normalizeHyperlinkUrl(link[2]);
        if(url){ blocks.push({id:uid('b'),type:'link',text:markdownInlineText(link[1]),url}); i++; continue; }
      }

      const paragraph=[trimmed]; i++;
      while(i<lines.length){
        const next=lines[i];
        if(!next.trim()) break;
        if(/^\s{0,3}(?:#{1,6})\s+/.test(next) || /^\s{0,3}(?:```|~~~)/.test(next) || /^\s*[-+*]\s+/.test(next) || /^\s*\d+[.)]\s+/.test(next) || /^\s*>/.test(next) || /^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/.test(next)) break;
        if(i+1<lines.length && next.includes('|') && isMarkdownTableSeparator(lines[i+1])) break;
        paragraph.push(next.trim()); i++;
      }
      pushText('text',paragraph.join(' '));
    }
    return blocks;
  }

  function selectionOffsetsWithin(root){
    const sel=window.getSelection();
    if(!sel?.rangeCount) return {start:(root.innerText||'').length,end:(root.innerText||'').length};
    const range=sel.getRangeAt(0);
    if(!root.contains(range.commonAncestorContainer)) return {start:(root.innerText||'').length,end:(root.innerText||'').length};
    const before=document.createRange(); before.selectNodeContents(root); before.setEnd(range.startContainer,range.startOffset);
    const through=document.createRange(); through.selectNodeContents(root); through.setEnd(range.endContainer,range.endOffset);
    return {start:before.toString().length,end:through.toString().length};
  }

  function pasteMarkdownIntoBlock(content,markdown){
    const row=content?.closest('.block-row'), location=findBlockLocation(row?.dataset.blockId), page=currentPage();
    if(!location || !page || !isTextLikeBlock(location.block)) return false;
    const parsed=parseMarkdownBlocks(markdown);
    if(!parsed.length) return false;

    const block=location.block, original=String(block.text||''), {start,end}=selectionOffsetsWithin(content);
    const left=original.slice(0,start), right=original.slice(end), splitLinks=inlineLinksAroundRange(block,start,end);
    const replacement=[];
    if(left){ block.text=left; block.inlineLinks=normalizeInlineLinkRanges(splitLinks.left,left.length); if(!block.inlineLinks.length) delete block.inlineLinks; replacement.push(block); }
    replacement.push(...parsed);
    let trailing=null;
    if(right){
      const trailingType=['bullet','number','todo','toggle'].includes(block.type)?block.type:'text';
      trailing={id:uid('b'),type:trailingType,text:right};
      const trailingLinks=normalizeInlineLinkRanges(splitLinks.right,right.length); if(trailingLinks.length) trailing.inlineLinks=trailingLinks;
      if(trailingType==='todo') trailing.checked=false;
      replacement.push(trailing);
    }
    location.blocks.splice(location.index,1,...replacement);
    ensureBlockList(location.blocks);
    scheduleSave(); hideFloatingMenus(); renderBlocks(page);

    const focusTarget=trailing || [...parsed].reverse().find(isTextLikeBlock) || (left?block:null);
    if(focusTarget) focusBlock(focusTarget.id,(focusTarget.text||'').length);
    toast(`Markdown pasted as ${parsed.length} block${parsed.length===1?'':'s'}`);
    return true;
  }

  function onBeforeInput(e){
    if(e.target===els.pageTitle && ['insertParagraph','insertLineBreak'].includes(e.inputType)) e.preventDefault();
  }

  function onPaste(e){
    if(externalIconPaneActive()){
      const file=transferImageFile(e.clipboardData);
      const targetIsTextField=e.target.matches?.('input,textarea,[contenteditable="true"]');
      if(file){ e.preventDefault(); loadPageIconFile(file); return; }
      if(!targetIsTextField && applyExternalIconTransfer(e.clipboardData)){ e.preventDefault(); return; }
    }
    if(e.target===els.pageTitle){
      e.preventDefault();
      const text=String(e.clipboardData?.getData('text/plain')||'').replace(/[\r\n\t]+/g,' ').replace(/\s{2,}/g,' ');
      insertTextAtSelection(e.target,text);
      e.target.dispatchEvent(new Event('input',{bubbles:true}));
      return;
    }
    const tableCell=e.target.closest?.('[data-table-cell]');
    if(tableCell && pasteTableMatrixIntoCell(tableCell,e.clipboardData)){
      e.preventDefault();
      return;
    }
    const item=[...(e.clipboardData?.items||[])].find(x=>x.type?.startsWith('image/'));
    if(item){
      const file=item.getAsFile();
      const row=e.target.closest('.block-row'), location=findBlockLocation(row?.dataset.blockId);
      if(file && location){
        e.preventDefault();
        const image={id:uid('b'),type:'image',src:'',caption:'',alt:''};
        location.blocks.splice(location.index+1,0,image); renderBlocks(currentPage()); loadImageFileIntoBlock(file,image.id);
        return;
      }
    }

    const content=e.target.closest?.('.block-content');
    if(content){
      const linkPayload=clipboardLinkPayload(e.clipboardData);
      if(linkPayload && pasteLinkIntoBlock(content,linkPayload)){ e.preventDefault(); return; }
      const explicitMarkdown=String(e.clipboardData?.getData('text/markdown')||'');
      const plainText=String(e.clipboardData?.getData('text/plain')||'');
      const markdown=explicitMarkdown || plainText;
      if(markdown && (explicitMarkdown || looksLikeMarkdown(markdown)) && pasteMarkdownIntoBlock(content,markdown)){
        e.preventDefault();
        return;
      }
    }
  }

  function updateEmojiMenu(content,b){
    if(!els.emojiMenu || activeSlashBlockId===b.id){ hideEmojiMenu(); return; }
    const caret=getCaretOffset(content), text=b.text||'', before=text.slice(0,caret);
    const colon=before.lastIndexOf(':');
    if(colon<0){ if(activeEmojiBlockId===b.id) hideEmojiMenu(); return; }
    const query=before.slice(colon+1);
    if(query.length>28 || /[\s:/\\]/.test(query)){ if(activeEmojiBlockId===b.id) hideEmojiMenu(); return; }
    // Avoid triggering inside common URL schemes while still allowing normal prose such as "status:".
    const prefix=before.slice(Math.max(0,colon-8),colon).toLowerCase();
    if(/https?$/.test(prefix)){ hideEmojiMenu(); return; }
    activeEmojiBlockId=b.id; emojiTokenStart=colon; emojiTokenEnd=caret; emojiIndex=0;
    renderEmojiResults(query);
    positionEmojiMenu(content);
  }
  function renderEmojiResults(query=''){
    const q=query.toLowerCase().trim();
    emojiMatches=EMOJI_CATALOG.filter(item=>!q||item.name.includes(q)).slice(0,96);
    const label=q ? `Emoji for :${escapeHtml(q)}` : 'Emoji';
    els.emojiResults.innerHTML=`<div class="emoji-menu-label">${label}</div>${emojiMatches.length?`<div class="emoji-grid">${emojiMatches.map((item,i)=>`<button class="emoji-choice ${i===emojiIndex?'selected':''}" data-emoji-choice="${escapeHtml(item.emoji)}" title=":${escapeHtml(item.name.split(' ')[0])}:"><span>${escapeHtml(item.emoji)}</span></button>`).join('')}</div>`:'<div class="emoji-empty">No emojis found</div>'}`;
    renderEmojiSelection();
  }
  function renderEmojiSelection(){
    const items=[...els.emojiResults.querySelectorAll('[data-emoji-choice]')];
    if(!items.length) return;
    emojiIndex=Math.max(0,Math.min(emojiIndex,items.length-1));
    items.forEach((item,i)=>item.classList.toggle('selected',i===emojiIndex));
    items[emojiIndex]?.scrollIntoView({block:'nearest'});
  }
  function positionEmojiMenu(content){
    const menu=els.emojiMenu; if(!menu)return;
    let rect=null, sel=window.getSelection();
    if(sel?.rangeCount && content.contains(sel.anchorNode)){
      const range=sel.getRangeAt(0).cloneRange(); range.collapse(true); rect=range.getBoundingClientRect();
    }
    if(!rect || (!rect.width&&!rect.height)) rect=content.getBoundingClientRect();
    const width=326, height=330;
    const left=Math.max(8,Math.min(rect.left,window.innerWidth-width-8));
    let top=rect.bottom+7; if(top+height>window.innerHeight-8) top=Math.max(8,rect.top-height-7);
    menu.style.left=`${left}px`; menu.style.top=`${top}px`; menu.classList.remove('hidden');
  }
  function chooseEmoji(emoji){
    const id=activeEmojiBlockId, b=findBlock(id); if(!b)return hideEmojiMenu();
    const text=b.text||'', start=emojiTokenStart, end=emojiTokenEnd;
    if(start<0||end<start||end>text.length)return hideEmojiMenu();
    b.text=text.slice(0,start)+emoji+text.slice(end);
    const caret=start+emoji.length; scheduleSave(); hideEmojiMenu(); renderBlocks(currentPage()); focusBlock(id,caret);
  }
  function hideEmojiMenu(){
    if(els.emojiMenu) els.emojiMenu.classList.add('hidden');
    activeEmojiBlockId=null; emojiTokenStart=-1; emojiTokenEnd=-1; emojiMatches=[]; emojiIndex=0;
  }

  function showSlashMenu(row,b){
    activeSlashBlockId=b.id; slashIndex=0; els.slashSearch.value=(b.text||'').slice(1); renderSlashResults(els.slashSearch.value);
    const rect=row.getBoundingClientRect(); els.slashMenu.style.left=`${Math.min(rect.left,window.innerWidth-325)}px`; els.slashMenu.style.top=`${Math.min(rect.bottom+2,window.innerHeight-450)}px`; els.slashMenu.classList.remove('hidden');
  }
  function hideSlashMenu(){ activeSlashBlockId=null; els.slashMenu.classList.add('hidden'); }
  function renderSlashResults(query=''){
    const q=query.toLowerCase().trim(); const items=BLOCK_TYPES.filter(x=>!q||`${x.name} ${x.desc} ${x.type}`.toLowerCase().includes(q));
    const groups=[...new Set(items.map(x=>x.group))]; let html='';
    groups.forEach(g=>{ html+=`<div class="slash-group">${g}</div>`; html+=items.filter(x=>x.group===g).map(x=>`<button class="slash-item" data-slash-type="${x.type}"><span class="slash-icon">${x.icon}</span><span><div class="slash-name">${x.name}</div><div class="slash-desc">${x.desc}</div></span></button>`).join(''); });
    els.slashResults.innerHTML=html; renderSlashSelection();
  }
  function renderSlashSelection(){ const items=[...els.slashResults.querySelectorAll('.slash-item')]; items.forEach((x,i)=>x.classList.toggle('selected',i===slashIndex)); items[slashIndex]?.scrollIntoView({block:'nearest'}); }
  function applySlashType(type){
    const b=findBlock(activeSlashBlockId); if(!b)return;
    const parent=currentPage();
    b.type=type; b.text='';
    if(!isListBlock(b)) delete b.indent;
    if(type==='todo') b.checked=false;
    if(type==='page'){
      const child=createSubpageForBlock(parent.id);
      b.pageId=child.id; delete b.text;
      hideSlashMenu();
      replaceActiveTab(child.id);
      scheduleSave(); renderAll();
      requestAnimationFrame(()=>{ els.pageTitle.focus(); selectAllContent(els.pageTitle); });
      return;
    }
    if(type==='image'){ b.src=''; b.caption=''; b.alt=''; delete b.text; }
    if(type==='link'){ b.text=''; b.url=''; }
    if(type==='code'){ b.language='bash'; b.codeWrap=false; b.codeLineNumbers=false; b.mermaidPreview=true; b.text=''; }
    if(type==='table'){ b.tableRows=Array.from({length:3},()=>Array(3).fill('')); b.tableHeaderRow=false; b.tableHeaderColumn=false; delete b.text; }
    if(type==='columns'){ b.columns=Array.from({length:2},()=>({id:uid('col'),blocks:[newTextBlock()]})); delete b.text; }
    if(type==='database'){ b.title='Untitled database'; b.columns=['Name','Status','Owner']; b.rows=[['','','']]; delete b.text; }
    scheduleSave(); hideSlashMenu(); renderBlocks(parent);
    if(type==='code') focusCodeBlock(b.id);
    else if(type==='link') focusHyperlinkBlock(b.id,'url');
    else if(type==='table') requestAnimationFrame(()=>document.querySelector(`.simple-table-block[data-block-id="${b.id}"] [data-table-cell="0:0"]`)?.focus());
    else if(type==='columns') requestAnimationFrame(()=>document.querySelector(`.columns-block[data-block-id="${b.id}"] .column-pane .block-content`)?.focus());
    else if(!['database','divider','image'].includes(type)) focusBlock(b.id,0);
  }

  function showBlockMenu(row,id){
    const block=findBlock(id);
    const isTable=block?.type==='table';
    if(isTable) normalizeSimpleTableBlock(block);
    const r=row.getBoundingClientRect(); const menuWidth=210, menuHeight=isTable?430:230; els.blockMenu.style.left=`${Math.max(8,Math.min(r.left-40,window.innerWidth-menuWidth-8))}px`; els.blockMenu.style.top=`${Math.max(8,Math.min(r.top+28,window.innerHeight-menuHeight-8))}px`;
    const tableOptions=isTable?`
      <div class="table-menu-section">
        <div class="table-menu-label">Table</div>
        <button class="block-menu-item" data-block-menu-action="table-add-row" data-block-id="${id}">＋ Add row to bottom</button>
        <button class="block-menu-item" data-block-menu-action="table-add-col" data-block-id="${id}">＋ Add column to right</button>
        <div class="block-menu-hint">Use the row and column handles on the table to insert, duplicate or delete a specific row or column.</div>
      </div>
      <div class="table-menu-section">
        <button class="block-menu-item" data-block-menu-action="table-header-row" data-block-id="${id}"><span class="menu-check">${block.tableHeaderRow?'✓':''}</span>Header row</button>
        <button class="block-menu-item" data-block-menu-action="table-header-col" data-block-id="${id}"><span class="menu-check">${block.tableHeaderColumn?'✓':''}</span>Header column</button>
      </div>`:'';
    els.blockMenu.style.width=`${menuWidth}px`; els.blockMenu.innerHTML=`${tableOptions}
      <div class="table-menu-section">
        <button class="block-menu-item" data-block-menu-action="duplicate" data-block-id="${id}">Duplicate</button>
        <button class="block-menu-item" data-block-menu-action="turn-text" data-block-id="${id}">Turn into text</button>
        <button class="block-menu-item" data-block-menu-action="move-up" data-block-id="${id}">Move up</button>
        <button class="block-menu-item" data-block-menu-action="move-down" data-block-id="${id}">Move down</button>
        ${blockDeleteMenuItem(id)}
      </div>`;
    els.blockMenu.classList.remove('hidden');
  }
  function runBlockMenuAction(action,id){
    const page=currentPage(), loc=findBlockLocation(id); if(!loc)return; const i=loc.index, blocks=loc.blocks, block=blocks[i];
    if(action.startsWith('table-') && block?.type==='table'){
      normalizeSimpleTableBlock(block);
      if(action==='table-add-row') block.tableRows.push(Array(block.tableRows[0].length).fill(''));
      if(action==='table-add-col') block.tableRows.forEach(r=>r.push(''));
      if(action==='table-header-row') block.tableHeaderRow=!block.tableHeaderRow;
      if(action==='table-header-col') block.tableHeaderColumn=!block.tableHeaderColumn;
      scheduleSave(); hideFloatingMenus(); renderBlocks(page); return;
    }
    if(action==='duplicate'){ blocks.splice(i+1,0,cloneBlockWithNewIds(blocks[i])); }
    if(action==='turn-text'){ const b=blocks[i], fallback=blockTextFallback(b); b.type='text'; b.text=fallback; delete b.indent; delete b.pageId; delete b.url; delete b.tableRows; delete b.tableHeaderRow; delete b.tableHeaderColumn; delete b.columns; }
    if(action==='move-up'&&i>0){ [blocks[i-1],blocks[i]]=[blocks[i],blocks[i-1]]; }
    if(action==='move-down'&&i<blocks.length-1){ [blocks[i+1],blocks[i]]=[blocks[i],blocks[i+1]]; }
    if(action==='delete'){ blocks.splice(i,1); ensureBlockList(blocks); }
    scheduleSave(); hideFloatingMenus(); renderBlocks(page);
  }

  function showPageMenu(row,id){
    const r=row.getBoundingClientRect(); els.blockMenu.style.left=`${Math.min(r.right-120,window.innerWidth-220)}px`; els.blockMenu.style.top=`${Math.min(r.bottom+2,window.innerHeight-240)}px`; els.blockMenu.style.width='200px';
    els.blockMenu.innerHTML=`<button class="block-menu-item" data-command="new-child" data-page-id="${id}">Add sub-page</button><button class="block-menu-item" data-command="duplicate-page" data-page-id="${id}">Duplicate</button><button class="block-menu-item" data-command="toggle-favorite" data-page-id="${id}">Toggle favorite</button><button class="block-menu-item danger" data-command="delete-page" data-page-id="${id}">Delete</button>`; els.blockMenu.classList.remove('hidden');
  }

  function openCommandPalette(){ els.commandPalette.classList.remove('hidden'); els.commandSearch.value=''; commandIndex=0; renderCommandResults(''); setTimeout(()=>els.commandSearch.focus(),0); }
  function renderCommandResults(q=''){
    const query=q.toLowerCase().trim();
    const actions=[
      {cmd:'new-page',icon:'＋',title:'New page',desc:'Create a blank page'},
      {cmd:'toggle-theme',icon:'◐',title:'Toggle theme',desc:'Switch light/dark mode'},
      {cmd:'settings',icon:'⚙',title:'Open settings',desc:'Workspace preferences'}
    ].filter(x=>!query||`${x.title} ${x.desc}`.toLowerCase().includes(query));
    const pages=state.pages.filter(p=>!query||(p.title||'Untitled').toLowerCase().includes(query));
    els.commandResults.innerHTML=`<div class="command-group-title">Actions</div>${actions.map(a=>commandItemHTML(a)).join('')}<div class="command-group-title">Pages</div>${pages.map(p=>`<button class="command-item" data-command="open-page" data-page-id="${p.id}"><span class="command-item-icon">${pageIconMarkup(p.icon)}</span><span class="command-item-main"><div class="command-item-title">${escapeHtml(p.title||'Untitled')}</div><div class="command-item-desc">Page</div></span></button>`).join('')}`;
    renderCommandSelection();
  }
  function commandItemHTML(a){ return `<button class="command-item" data-command="${a.cmd}"><span class="command-item-icon">${a.icon}</span><span class="command-item-main"><div class="command-item-title">${a.title}</div><div class="command-item-desc">${a.desc}</div></span></button>`; }
  function renderCommandSelection(){ const items=[...els.commandResults.querySelectorAll('.command-item')]; items.forEach((x,i)=>x.classList.toggle('selected',i===commandIndex)); items[commandIndex]?.scrollIntoView({block:'nearest'}); }
  function runCommand(cmd,pageId){
    els.commandPalette.classList.add('hidden'); els.blockMenu.classList.add('hidden');
    if(cmd==='open-page') openPage(pageId);
    if(cmd==='new-page') createPage();
    if(cmd==='toggle-theme') cycleTheme();
    if(cmd==='settings'){ updateSettingsText(); els.settingsModal.classList.remove('hidden'); }
    if(cmd==='new-child') createPage(pageId);
    if(cmd==='duplicate-page') duplicatePage(pageId);
    if(cmd==='toggle-favorite'){ const p=pageById(pageId); p.favorite=!p.favorite; scheduleSave(); renderSidebar(); if(pageId===state.currentPageId)els.favoriteBtn.textContent=p.favorite?'★':'☆'; }
    if(cmd==='delete-page') deletePage(pageId);
  }

  function positionPageMetaMenu(anchor,width=320){
    const r=anchor.getBoundingClientRect(); const menu=els.pageMetaMenu; menu.style.width=`${width}px`;
    const left=Math.max(8,Math.min(r.left,window.innerWidth-width-8));
    menu.style.left=`${left}px`; menu.style.top=`${Math.min(r.bottom+5,window.innerHeight-440)}px`;
    menu.classList.remove('hidden');
  }
  function showIconMenu(anchor){
    const p=currentPage(); hideFloatingMenus();
    const external=isExternalPageIcon(p.icon);
    const initialTab=external?'external':'emoji';
    els.pageMetaMenu.innerHTML=`<div class="meta-menu-head"><span>Page icon</span>${p.icon?'<button class="meta-menu-remove" data-remove-icon>Remove</button>':''}</div>
      <div class="icon-picker-tabs" role="tablist" aria-label="Icon source">
        <button type="button" class="icon-picker-tab ${initialTab==='emoji'?'active':''}" data-icon-picker-tab="emoji" role="tab" aria-selected="${initialTab==='emoji'}">Emoji</button>
        <button type="button" class="icon-picker-tab ${initialTab==='external'?'active':''}" data-icon-picker-tab="external" role="tab" aria-selected="${initialTab==='external'}">External</button>
      </div>
      <div class="icon-picker-pane ${initialTab==='emoji'?'':'hidden'}" data-icon-picker-pane="emoji">
        <div class="icon-picker-search"><span>⌕</span><input data-icon-search type="search" placeholder="Search emojis..." autocomplete="off" spellcheck="false"></div>
        <div class="icon-picker-scroll">
          <div data-icon-results></div>
          <div class="meta-custom-row"><input data-custom-icon-input maxlength="12" placeholder="Paste an emoji" value=""><button data-custom-icon-submit>Use</button></div>
        </div>
      </div>
      <div class="icon-picker-pane ${initialTab==='external'?'':'hidden'}" data-icon-picker-pane="external">
        <div class="external-icon-tab-body">
          ${external?`<div class="external-icon-current"><span class="external-icon-preview">${pageIconMarkup(p.icon,'')}</span><span>Current external icon</span></div>`:''}
          <label class="external-icon-field-label">Image URL</label>
          <div class="external-icon-url-row"><input data-external-icon-url type="url" placeholder="https://.../icon.svg" spellcheck="false"><button data-external-icon-submit>Use URL</button></div>
          <div class="external-icon-divider"><span>or</span></div>
          <div class="external-icon-dropzone" data-external-icon-dropzone tabindex="0" role="button" aria-label="Drop, paste or browse for an external icon">
            <span class="external-icon-drop-glyph" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5"/><path d="M5 14.5V19h14v-4.5"/></svg></span>
            <span class="external-icon-drop-title">Drop an icon here</span>
            <span class="external-icon-drop-subtitle">or paste an image with Ctrl/Cmd+V</span>
            <button class="external-icon-upload" type="button" data-external-icon-upload>Browse files</button>
          </div>
          <div class="external-icon-help">Accepts SVG, PNG, JPG, WEBP, GIF and ICO. You can also drop an image URL. Local files are stored inside this vault (max 1.5 MB).</div>
        </div>
      </div>`;
    renderIconPickerResults('');
    positionPageMetaMenu(anchor,340);
    setTimeout(()=>{
      const selector=initialTab==='emoji'?'[data-icon-search]':'[data-external-icon-url]';
      els.pageMetaMenu.querySelector(selector)?.focus({preventScroll:true});
    },0);
  }
  function switchIconPickerTab(tab){
    if(!els.pageMetaMenu || !['emoji','external'].includes(tab))return;
    els.pageMetaMenu.querySelectorAll('[data-icon-picker-tab]').forEach(btn=>{
      const active=btn.dataset.iconPickerTab===tab;
      btn.classList.toggle('active',active);
      btn.setAttribute('aria-selected',String(active));
    });
    els.pageMetaMenu.querySelectorAll('[data-icon-picker-pane]').forEach(pane=>pane.classList.toggle('hidden',pane.dataset.iconPickerPane!==tab));
    requestAnimationFrame(()=>{
      const selector=tab==='emoji'?'[data-icon-search]':'[data-external-icon-url]';
      els.pageMetaMenu.querySelector(selector)?.focus({preventScroll:true});
    });
  }
  function renderIconPickerResults(query=''){
    const host=els.pageMetaMenu?.querySelector('[data-icon-results]'); if(!host)return;
    const p=currentPage(); const q=String(query||'').trim().toLowerCase();
    const matches=EMOJI_CATALOG.filter(item=>!q || item.emoji.includes(q) || item.name.toLowerCase().includes(q));
    host.innerHTML=matches.length?`<div class="icon-picker-grid">${matches.map(item=>`<button class="icon-picker-item ${p?.icon===item.emoji?'selected':''}" data-icon-choice="${escapeHtml(item.emoji)}" title="${escapeHtml(item.name)}">${escapeHtml(item.emoji)}</button>`).join('')}</div>`:'<div class="icon-picker-empty">No icons found</div>';
  }
  function setPageIcon(icon,pageId=state.currentPageId){ const p=pageById(pageId); if(!p || state.currentPageId!==pageId)return; p.icon=icon; scheduleSave(); els.pageMetaMenu.classList.add('hidden'); renderPage(); renderSidebar(); renderTabs(); renderRightSidebar(); }
  function applyExternalIconUrl(value){
    const url=normalizeExternalIconUrl(value);
    if(!url){ toast('Enter a valid image URL'); return; }
    const operationEpoch=pageOperationEpoch, pageId=state.currentPageId;
    const img=new Image(); let settled=false;
    const finish=(ok)=>{ if(settled)return; settled=true; if(operationEpoch!==pageOperationEpoch || state.currentPageId!==pageId)return; if(ok)setPageIcon(url,pageId); else toast('Could not load that icon'); };
    img.onload=()=>finish(true); img.onerror=()=>finish(false); img.src=url;
    setTimeout(()=>finish(false),7000);
  }
  function loadPageIconFile(file){
    if(!file)return;
    const operationEpoch=pageOperationEpoch, pageId=state.currentPageId;
    const allowed=file.type.startsWith('image/') || /\.(svg|png|jpe?g|webp|gif|ico)$/i.test(file.name||'');
    if(!allowed){ toast('Choose an SVG, PNG, JPG, WEBP, GIF or ICO file'); return; }
    if(file.size>1.5*1024*1024){ toast('Icon file is too large (max 1.5 MB)'); return; }
    const reader=new FileReader();
    reader.onload=()=>{ if(operationEpoch!==pageOperationEpoch || state.currentPageId!==pageId)return; const data=String(reader.result||''); if(!isExternalPageIcon(data)){ toast('Unsupported icon file'); return; } setPageIcon(data,pageId); };
    reader.onerror=()=>toast('Could not read the icon file');
    reader.readAsDataURL(file);
  }
  function externalIconPaneActive(){
    return !!els.pageMetaMenu?.querySelector('[data-icon-picker-pane="external"]:not(.hidden)');
  }
  function transferImageFile(data){
    const direct=[...(data?.files||[])].find(file=>file?.type?.startsWith('image/') || /\.(svg|png|jpe?g|webp|gif|ico)$/i.test(file?.name||''));
    if(direct)return direct;
    const item=[...(data?.items||[])].find(entry=>entry?.type?.startsWith('image/'));
    return item?.getAsFile?.()||null;
  }
  function transferExternalIconText(data){
    const uri=String(data?.getData?.('text/uri-list')||'').split(/\r?\n/).map(v=>v.trim()).find(v=>v && !v.startsWith('#'))||'';
    return uri || String(data?.getData?.('text/plain')||'').trim();
  }
  function applyExternalIconTransfer(data,{allowText=true}={}){
    const file=transferImageFile(data);
    if(file){ loadPageIconFile(file); return true; }
    if(!allowText)return false;
    const text=transferExternalIconText(data);
    if(!text)return false;
    if(/^data:image\//i.test(text)){ setPageIcon(text); return true; }
    if(/^<svg[\s>]/i.test(text)){
      const file=new File([text],'clipboard-icon.svg',{type:'image/svg+xml'});
      loadPageIconFile(file); return true;
    }
    if(normalizeExternalIconUrl(text)){ applyExternalIconUrl(text); return true; }
    return false;
  }
  function clearExternalIconDropState(){
    els.pageMetaMenu?.querySelectorAll('[data-external-icon-dropzone].drag-over').forEach(zone=>zone.classList.remove('drag-over'));
  }

  function openComments(){
    hideFloatingMenus(); const p=currentPage(); if(!p.comments)p.comments=[];
    els.pageComments.classList.remove('hidden'); renderPageComments();
    requestAnimationFrame(()=>els.pageComments.querySelector('[data-comment-input]')?.focus());
  }
  function renderPageComments(){
    const p=currentPage(); const comments=p.comments||[];
    els.pageComments.innerHTML=`<div class="comments-head"><div class="comments-title">Page comments${comments.length?` · ${comments.length}`:''}</div><button class="comments-close" data-comments-close title="Close">×</button></div>
      <div class="comment-composer"><div class="comment-avatar">YOU</div><div class="comment-input-wrap"><textarea class="comment-input" data-comment-input placeholder="Add a comment…"></textarea><div class="comment-actions"><button class="comment-submit" data-comment-submit>Comment</button></div></div></div>
      <div class="comments-list">${comments.length?comments.map(commentHTML).join(''):'<div class="comments-empty">No comments yet.</div>'}</div>`;
  }
  function commentHTML(c){ return `<div class="comment-item"><div class="comment-avatar">YOU</div><div class="comment-body"><div class="comment-meta"><span class="comment-author">You</span><span class="comment-time">${escapeHtml(formatCommentTime(c.createdAt))}</span><button class="comment-delete" data-comment-delete="${c.id}" title="Delete comment">×</button></div><div class="comment-text">${escapeHtml(c.text||'')}</div></div></div>`; }
  function formatCommentTime(value){ const d=new Date(value); if(Number.isNaN(d.getTime()))return ''; return d.toLocaleString([], {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}); }
  function addPageComment(){ const input=els.pageComments.querySelector('[data-comment-input]'); const text=input?.value.trim(); if(!text)return; const p=currentPage(); if(!p.comments)p.comments=[]; p.comments.push({id:uid('comment'),text,createdAt:new Date().toISOString()}); scheduleSave(); renderPageComments(); els.addCommentBtn.textContent=`Comments ${p.comments.length}`; requestAnimationFrame(()=>els.pageComments.querySelector('[data-comment-input]')?.focus()); }
  function deletePageComment(id){ const p=currentPage(); p.comments=(p.comments||[]).filter(c=>c.id!==id); scheduleSave(); renderPageComments(); els.addCommentBtn.textContent=p.comments.length?`Comments ${p.comments.length}`:'Add comment'; }


  function applyTheme(){
    let dark=false;
    if(state.theme==='dark')dark=true; else if(state.theme==='system')dark=matchMedia('(prefers-color-scheme: dark)').matches;
    document.body.classList.toggle('dark',dark); updateSettingsText();
    mermaidConfiguredTheme=null;
    scheduleMermaidPreviews();
  }
  function cycleTheme(){ const options=['system','light','dark']; state.theme=options[(options.indexOf(state.theme)+1)%options.length]; scheduleSave(); applyTheme(); toast(`Theme: ${state.theme}`); }
  function updateSettingsText(){ if(els.themeToggle) els.themeToggle.innerHTML=`<span class="select-btn-label">${state.theme[0].toUpperCase()+state.theme.slice(1)}</span>${chevronSvg('down','select-chevron')}`; }

  function exportWorkspace(){
    const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='novera-workspace.json'; a.click(); URL.revokeObjectURL(url); toast('Workspace exported');
  }
  function importWorkspace(file){
    const reader=new FileReader(); reader.onload=()=>{ try{ const data=JSON.parse(reader.result); if(!data.pages?.length)throw new Error(); state=normalizeWorkspace(data); state.name=activeVaultMeta()?.name||state.name; scheduleSave(); applyTheme(); renderAll(); els.settingsModal.classList.add('hidden'); toast('Workspace imported'); }catch{ toast('Invalid workspace file'); } }; reader.readAsText(file); eTargetReset();
    function eTargetReset(){ els.importFile.value=''; }
  }

  function insertTextAtSelection(root,text){
    const sel=window.getSelection();
    if(!sel?.rangeCount){ root.append(document.createTextNode(text)); return; }
    const range=sel.getRangeAt(0);
    if(!root.contains(range.commonAncestorContainer)){ root.append(document.createTextNode(text)); return; }
    range.deleteContents();
    const node=document.createTextNode(text); range.insertNode(node);
    range.setStartAfter(node); range.collapse(true); sel.removeAllRanges(); sel.addRange(range);
  }

  function focusBlock(id,offset=0){
    requestAnimationFrame(()=>{ const el=document.querySelector(`.block-row[data-block-id="${id}"] .block-content`); if(!el)return; el.focus(); setCaretOffset(el,offset); });
  }
  function getCaretOffset(el){ const sel=window.getSelection(); if(!sel.rangeCount)return 0; const range=sel.getRangeAt(0).cloneRange(); range.selectNodeContents(el); range.setEnd(sel.anchorNode,sel.anchorOffset); return range.toString().length; }
  function setCaretOffset(el,offset){ const range=document.createRange(), sel=window.getSelection(); let remaining=offset, node=null, pos=0; const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT); while(walker.nextNode()){ const n=walker.currentNode; if(remaining<=n.textContent.length){node=n;pos=remaining;break;} remaining-=n.textContent.length; } if(!node){node=el;pos=el.childNodes.length;} range.setStart(node,pos); range.collapse(true); sel.removeAllRanges(); sel.addRange(range); }
  function selectAllContent(el){ const range=document.createRange(); range.selectNodeContents(el); const sel=window.getSelection(); sel.removeAllRanges(); sel.addRange(range); }

  function renderCurrentBlocksKeepFocus(){ renderBlocks(currentPage()); }
  function hideFloatingMenus(){ els.slashMenu.classList.add('hidden'); hideEmojiMenu(); els.blockMenu.classList.add('hidden'); els.pageMetaMenu?.classList.add('hidden'); activeSlashBlockId=null; }
  function cancelPageOperations(){
    pageOperationEpoch+=1;
    clearMultiBlockSelection();
    clearSelectedTable();
    hideFloatingMenus();
    clearExternalIconDropState();
    activeImageBlockId=null; activeImageLinkBlockId=null;
    if(els.imageFileInput) els.imageFileInput.value='';
    if(els.pageIconFileInput) els.pageIconFileInput.value='';
    if(els.pageComments){ els.pageComments.classList.add('hidden'); els.pageComments.innerHTML=''; }
    els.commandPalette?.classList.add('hidden');
    els.shareModal?.classList.add('hidden');
    els.settingsModal?.classList.add('hidden');
    if(els.vaultDialog && !els.vaultDialog.classList.contains('hidden')) closeVaultDialog();
    clearDragState();
    const active=document.activeElement;
    if(active && active!==document.body && typeof active.blur==='function') active.blur();
    try{ window.getSelection()?.removeAllRanges(); }catch{}
  }
  function toast(msg){ els.toast.textContent=msg; els.toast.classList.remove('hidden'); clearTimeout(toast._t); toast._t=setTimeout(()=>els.toast.classList.add('hidden'),1700); }
  function dayPart(){ const h=new Date().getHours(); return h<12?'morning':h<18?'afternoon':'evening'; }
  function countWords(page){ return flattenBlocks(page.blocks||[]).reduce((n,b)=>n+(`${b.text||''} ${b.caption||''}`.trim().split(/\s+/).filter(Boolean).length),0); }

  function chevronSvg(direction='down', extraClass=''){
    const path = direction==='right' ? 'M9 6l6 6-6 6' : 'M6 9l6 6 6-6';
    const cls = `ui-chevron${extraClass ? ' '+extraClass : ''}`;
    return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${path}"></path></svg>`;
  }

  function escapeHtml(s=''){ return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

  init();
})();
