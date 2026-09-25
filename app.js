(() => {
  'use strict';

  const DB_NAME = 'novera-local-workspace';
  const DB_VERSION = 1;
  const DB_META_STORE = 'meta';
  const DB_VAULT_STORE = 'vaults';
  const DB_REGISTRY_KEY = 'registry';
  const uid = (prefix = 'id') => `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
  const clone = obj => JSON.parse(JSON.stringify(obj));
  const MAIN_EDITOR_GROUP = 'editor_main';
  const DEFAULT_SHORTCUTS = Object.freeze({
    undo:'Mod+Z',redo:'Mod+Shift+Z',search:'Mod+K',favorite:'Mod+Shift+F',comments:'Mod+Alt+M',share:'Mod+Alt+S',
    toggleRightSidebar:'Mod+Alt+R',toggleTheme:'Mod+Shift+L',settings:'Mod+Alt+,',newPage:'Mod+Alt+N',graph:'Mod+Alt+G',
    splitRight:'Mod+Alt+ArrowRight',splitDown:'Mod+Alt+ArrowDown',mergePanes:'Mod+Alt+Backspace'
  });
  const SHORTCUT_ACTIONS = [
    {id:'undo',label:'Undo'}, {id:'redo',label:'Redo'}, {id:'search',label:'Open search'},
    {id:'favorite',label:'Toggle page favorite'}, {id:'comments',label:'Open page comments'}, {id:'share',label:'Share current page'},
    {id:'toggleRightSidebar',label:'Toggle right sidebar'}, {id:'toggleTheme',label:'Cycle theme'},
    {id:'settings',label:'Open settings'}, {id:'newPage',label:'Create a new page'}, {id:'graph',label:'Open graph view'},
    {id:'splitRight',label:'Split editor right'}, {id:'splitDown',label:'Split editor down'}, {id:'mergePanes',label:'Merge editor panes'}
  ];
  const RESERVED_SHORTCUTS = new Set(['Mod+B','Mod+I','Mod+U','Mod+E','Mod+F','Mod+H','Mod+J','Mod+L','Mod+N','Mod+O','Mod+P','Mod+R','Mod+S','Mod+T','Mod+Shift+S','Mod+Shift+M','Mod+Shift+G','Mod+Shift+O','Mod+Shift+T','Mod+Shift+W','Mod+ENTER','Mod+TAB','Mod+W']);

  function normalizeShortcutValue(value){
    if(typeof value!=='string' || !value.trim()) return '';
    const parts=value.split('+').map(part=>part.trim()).filter(Boolean), key=(parts.pop()||'').toUpperCase();
    const aliases={CTRL:'Mod',CONTROL:'Mod',META:'Mod',CMD:'Mod',COMMAND:'Mod',OPTION:'Alt'};
    const modifiers=new Set();
    for(const part of parts){
      const modifier=aliases[part.toUpperCase()]||part[0]?.toUpperCase()+part.slice(1).toLowerCase();
      if(!['Mod','Alt','Shift'].includes(modifier)) return '';
      modifiers.add(modifier);
    }
    if(!key || (!modifiers.has('Mod')&&!modifiers.has('Alt'))) return '';
    const ordered=['Mod','Alt','Shift'].filter(modifier=>modifiers.has(modifier));
    return [...ordered,key].join('+');
  }
  function normalizeWorkspaceShortcuts(shortcuts){
    const source=shortcuts&&typeof shortcuts==='object'?shortcuts:{};
    const normalized={},used=new Set();
    for(const [action,fallback] of Object.entries(DEFAULT_SHORTCUTS)){
      const provided=Object.prototype.hasOwnProperty.call(source,action);
      let value=provided?normalizeShortcutValue(source[action]):fallback;
      const reserved=RESERVED_SHORTCUTS.has(value)||(value==='Mod+K'&&action!=='search');
      if(reserved || (value&&used.has(value))) value=fallback;
      if(RESERVED_SHORTCUTS.has(value)||(value==='Mod+K'&&action!=='search')||used.has(value)) value='';
      normalized[action]=value;
      if(value) used.add(value);
    }
    return normalized;
  }
  function shortcutFromEvent(event){
    if(event.getModifierState?.('AltGraph')) return '';
    if(['Control','Meta','Alt','Shift'].includes(event.key)) return '';
    const key=event.key===' '?'Space':event.key==='+'?'Plus':event.key.length===1?event.key.toUpperCase():event.key.toUpperCase();
    const modifiers=[];
    if(event.ctrlKey||event.metaKey) modifiers.push('Mod');
    if(event.altKey) modifiers.push('Alt');
    if(event.shiftKey) modifiers.push('Shift');
    return normalizeShortcutValue([...modifiers,key].join('+'));
  }
  function formatShortcut(value){
    if(!value) return 'Not set';
    const mac=/Mac|iPhone|iPad/i.test(navigator.platform||'');
    const keyNames={SPACE:'Space',ESCAPE:'Esc',ARROWUP:'↑',ARROWDOWN:'↓',ARROWLEFT:'←',ARROWRIGHT:'→'};
    return value.split('+').map(part=>part==='Mod'?(mac?'⌘':'Ctrl'):part==='Alt'?(mac?'⌥':'Alt'):part==='Shift'?(mac?'⇧':'Shift'):(keyNames[part]||part)).join(' + ');
  }

  const DEFAULT_WORKSPACE = {
    name: "StrongCod3r's Space",
    theme: 'system',
    shortcuts: {...DEFAULT_SHORTCUTS},
    currentPageId: 'welcome',
    activeTabId: 'tab_welcome',
    activeEditorGroupId: MAIN_EDITOR_GROUP,
    editorLayout: {type:'group',id:MAIN_EDITOR_GROUP,activeTabId:'tab_welcome'},
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
          { id:'b10', type:'text', text:'Enter creates a block · Backspace on an empty block merges/removes it · Ctrl/Cmd+K opens search · Ctrl/Cmd+Z undoes · Ctrl/Cmd+Shift+Z redoes. Configure app shortcuts in Settings → Keyboard shortcuts.' }
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
    { type:'page-link', icon:'↗', name:'Link to page', desc:'Link to an existing page without nesting it', group:'Basic' },
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

  let vaultRegistry = {activeVaultId:null,vaults:[]};
  let activeVaultId = null;
  let state = normalizeWorkspace(clone(DEFAULT_WORKSPACE));
  let storageDbPromise = null;
  let storageWriteChain = Promise.resolve();
  let eventsBound = false;
  let graphViewRuntime = {scale:1};
  let activeSlashBlockId = null;
  let slashIndex = 0;
  let activeEmojiBlockId = null;
  let emojiIndex = 0;
  let emojiTokenStart = -1;
  let emojiTokenEnd = -1;
  let emojiMatches = [];
  let commandIndex = 0;
  let shortcutCaptureAction = null;
  let dragBlockId = null;
  let dragTabId = null;
  let dockDrop = null;
  let tableAxisDrag = null;
  let activeImageBlockId = null;
  let activeImageLinkBlockId = null;
  let activeImageCropBlockId = null;
  let imageCropSession = null;
  let activePageLinkBlockId = null;
  let pageOperationEpoch = 0;
  let multiBlockSelection = null;
  let selectedTableBlockId = null;
  let tableCellSelection = null;
  let inlineSelectionState = null;
  let inlineSelectionUpdateTimer = null;
  let inlinePointerSelectionActive = false;
  let inlineKeyboardSelectionActive = false;
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
    editorView:$('editorView'), editorDock:$('editorDock'), homeView:$('homeView'), graphView:$('graphView'), pageTitle:$('pageTitle'), pageIcon:$('pageIcon'),
    blockEditor:$('blockEditor'), emptyHint:$('emptyHint'), pageComments:$('pageComments'), pageMetaMenu:$('pageMetaMenu'),
    commandPalette:$('commandPalette'), commandSearch:$('commandSearch'), commandResults:$('commandResults'),
    slashMenu:$('slashMenu'), slashSearch:$('slashSearch'), slashResults:$('slashResults'), emojiMenu:$('emojiMenu'), emojiResults:$('emojiResults'), blockMenu:$('blockMenu'), textFormatToolbar:$('textFormatToolbar'),
    shareModal:$('shareModal'), settingsModal:$('settingsModal'), themeToggle:$('themeToggle'), shortcutList:$('shortcutList'),
    importFile:$('importFile'), imageFileInput:$('imageFileInput'), pageIconFileInput:$('pageIconFileInput'), vaultSelect:$('vaultSelect'), createVaultBtn:$('createVaultBtn'), renameVaultBtn:$('renameVaultBtn'), deleteVaultBtn:$('deleteVaultBtn'),
    vaultDialog:$('vaultDialog'), vaultDialogTitle:$('vaultDialogTitle'), vaultDialogInput:$('vaultDialogInput'), vaultDialogError:$('vaultDialogError'), vaultDialogConfirm:$('vaultDialogConfirm'), toast:$('toast')
  };
  const baseEditorElements={pageTitle:els.pageTitle,pageIcon:els.pageIcon,pageComments:els.pageComments,blockEditor:els.blockEditor,emptyHint:els.emptyHint};

  function makeBlankWorkspace(){
    const pageId=uid('page'), tabId=uid('tab');
    return {
      name:'', theme:state?.theme || 'system', currentPageId:pageId, activeTabId:tabId, activeEditorGroupId:MAIN_EDITOR_GROUP,
      editorLayout:{type:'group',id:MAIN_EDITOR_GROUP,activeTabId:tabId}, openTabs:[{id:tabId,kind:'page',pageId,groupId:MAIN_EDITOR_GROUP}], sidebarOpen:true, rightSidebarOpen:true,
      leftPanelMode:'files', rightPanelMode:'outline', mainView:'page', sidebarWidth:276, rightSidebarWidth:286, shortcuts:{...DEFAULT_SHORTCUTS},
      pages:[{id:pageId,parentId:null,title:'Untitled',icon:'📄',favorite:false,expanded:true,blocks:[newTextBlock()]}]
    };
  }

  function normalizeWorkspace(parsed){
    if (!parsed?.pages?.length) parsed=clone(DEFAULT_WORKSPACE);
    parsed.pages.forEach(p => { if ('cover' in p) delete p.cover; p.blocks=normalizeBlockTree(p.blocks); });
    const pageIds = new Set(parsed.pages.map(p => p.id));
    parsed.editorLayout=normalizeEditorLayout(parsed.editorLayout);
    const groups=editorGroups(parsed.editorLayout);
    const groupIds=new Set(groups.map(group=>group.id));
    const fallbackGroup=groups[0].id;
    if (!['page','graph'].includes(parsed.mainView)) parsed.mainView = 'page';
    if (!Array.isArray(parsed.openTabs)) parsed.openTabs = [];
    parsed.openTabs = parsed.openTabs.map(tab => {
      if (typeof tab === 'string') return pageIds.has(tab) ? {id:uid('tab'),kind:'page',pageId:tab,groupId:fallbackGroup} : null;
      if (!tab || typeof tab !== 'object') return null;
      const groupId=groupIds.has(tab.groupId)?tab.groupId:fallbackGroup;
      if(tab.kind==='graph' || tab.view==='graph') return {id:tab.id||uid('tab'),kind:'graph',groupId};
      const pageId = tab.pageId || (pageIds.has(tab.id) ? tab.id : null);
      return pageId && pageIds.has(pageId) ? {id:tab.id && tab.pageId ? tab.id : uid('tab'),kind:'page',pageId,groupId} : null;
    }).filter(Boolean);
    if (parsed.currentPageId !== '__home__' && !pageIds.has(parsed.currentPageId)) parsed.currentPageId = parsed.openTabs.find(t=>t.kind!=='graph'&&t.pageId)?.pageId || parsed.pages[0].id;
    if(parsed.mainView==='graph'){
      let active=parsed.openTabs.find(t=>t.id===parsed.activeTabId && t.kind==='graph') || parsed.openTabs.find(t=>t.kind==='graph');
      if(!active){ active={id:uid('tab'),kind:'graph',groupId:fallbackGroup}; parsed.openTabs.push(active); }
      parsed.activeTabId=active.id;
    } else if (parsed.currentPageId !== '__home__') {
      let active = parsed.openTabs.find(t => t.id === parsed.activeTabId && t.kind!=='graph' && t.pageId === parsed.currentPageId) || parsed.openTabs.find(t => t.kind!=='graph' && t.pageId === parsed.currentPageId);
      if (!active) { active={id:uid('tab'),kind:'page',pageId:parsed.currentPageId,groupId:fallbackGroup}; parsed.openTabs.push(active); }
      parsed.activeTabId = active.id;
    } else parsed.activeTabId = null;
    const activeTab=parsed.openTabs.find(tab=>tab.id===parsed.activeTabId);
    parsed.activeEditorGroupId=activeTab?.groupId || (groupIds.has(parsed.activeEditorGroupId)?parsed.activeEditorGroupId:fallbackGroup);
    for(const group of groups){
      const tabs=parsed.openTabs.filter(tab=>tab.groupId===group.id);
      if(!tabs.some(tab=>tab.id===group.activeTabId)) group.activeTabId=tabs[0]?.id||null;
    }
    if(activeTab) editorGroup(parsed.editorLayout,activeTab.groupId).activeTabId=activeTab.id;
    if (typeof parsed.sidebarOpen !== 'boolean') parsed.sidebarOpen = true;
    if (typeof parsed.rightSidebarOpen !== 'boolean') parsed.rightSidebarOpen = true;
    if (!['files','favorites'].includes(parsed.leftPanelMode)) parsed.leftPanelMode = 'files';
    if (!['outline','backlinks'].includes(parsed.rightPanelMode)) parsed.rightPanelMode = 'outline';
    if (!Number.isFinite(parsed.sidebarWidth)) parsed.sidebarWidth = 276;
    if (!Number.isFinite(parsed.rightSidebarWidth)) parsed.rightSidebarWidth = 286;
    parsed.shortcuts=normalizeWorkspaceShortcuts(parsed.shortcuts);
    return parsed;
  }

  function normalizeEditorLayout(node,seen=new Set()){
    if(node?.type==='split' && node.first && node.second){
      return {type:'split',direction:node.direction==='column'?'column':'row',ratio:Math.max(.2,Math.min(.8,Number(node.ratio)||.5)),first:normalizeEditorLayout(node.first,seen),second:normalizeEditorLayout(node.second,seen)};
    }
    let id=typeof node?.id==='string'&&node.id?node.id:MAIN_EDITOR_GROUP;
    if(seen.has(id)) id=uid('editor_group');
    seen.add(id);
    return {type:'group',id,activeTabId:node?.activeTabId||null};
  }
  function editorGroups(node,out=[]){
    if(node?.type==='split'){ editorGroups(node.first,out); editorGroups(node.second,out); }
    else if(node?.type==='group') out.push(node);
    return out;
  }
  function editorGroup(node,id){ return editorGroups(node).find(group=>group.id===id)||null; }

  function openStorageDb(){
    if(storageDbPromise) return storageDbPromise;
    storageDbPromise=new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,DB_VERSION);
      request.onupgradeneeded=()=>{
        const db=request.result;
        if(!db.objectStoreNames.contains(DB_META_STORE)) db.createObjectStore(DB_META_STORE,{keyPath:'key'});
        if(!db.objectStoreNames.contains(DB_VAULT_STORE)) db.createObjectStore(DB_VAULT_STORE,{keyPath:'id'});
      };
      request.onsuccess=()=>{
        const db=request.result;
        db.onversionchange=()=>db.close();
        resolve(db);
      };
      request.onerror=()=>reject(request.error||new Error('Could not open IndexedDB'));
      request.onblocked=()=>reject(new Error('IndexedDB upgrade is blocked by another Novera tab'));
    });
    return storageDbPromise;
  }

  function idbRequest(request){
    return new Promise((resolve,reject)=>{
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||new Error('IndexedDB request failed'));
    });
  }

  function idbTransactionDone(tx){
    return new Promise((resolve,reject)=>{
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error||new Error('IndexedDB transaction failed'));
      tx.onabort=()=>reject(tx.error||new Error('IndexedDB transaction aborted'));
    });
  }

  async function idbGet(storeName,key){
    const db=await openStorageDb();
    const tx=db.transaction(storeName,'readonly');
    // Attach the completion handlers before awaiting the request. IndexedDB may
    // complete the transaction immediately after request success; attaching
    // oncomplete afterwards can miss the event and leave initialization pending.
    const done=idbTransactionDone(tx);
    const value=await idbRequest(tx.objectStore(storeName).get(key));
    await done;
    return value;
  }

  function queueStorageWrite(operation){
    storageWriteChain=storageWriteChain.then(operation,operation);
    return storageWriteChain;
  }

  function sanitizeVaultRegistry(saved){
    if(!saved?.vaults?.length) return null;
    const vaults=saved.vaults.filter(v=>v?.id&&v?.name).map(v=>({id:String(v.id),name:String(v.name)}));
    if(!vaults.length) return null;
    const activeVaultId=vaults.some(v=>v.id===saved.activeVaultId)?String(saved.activeVaultId):vaults[0].id;
    return {activeVaultId,vaults};
  }

  async function loadVaultRegistry(){
    const saved=await idbGet(DB_META_STORE,DB_REGISTRY_KEY);
    const existing=sanitizeVaultRegistry(saved?.value);
    if(existing) return existing;

    const id=uid('vault');
    const name=(DEFAULT_WORKSPACE.name||'Novera Vault').trim()||'Novera Vault';
    const registry={activeVaultId:id,vaults:[{id,name}]};
    const workspace=normalizeWorkspace(clone(DEFAULT_WORKSPACE));
    workspace.name=name;

    const db=await openStorageDb();
    const tx=db.transaction([DB_META_STORE,DB_VAULT_STORE],'readwrite');
    tx.objectStore(DB_META_STORE).put({key:DB_REGISTRY_KEY,value:clone(registry),createdAt:new Date().toISOString()});
    tx.objectStore(DB_VAULT_STORE).put({id,workspace,updatedAt:new Date().toISOString()});
    await idbTransactionDone(tx);
    return registry;
  }

  function saveVaultRegistry(){
    const snapshot=clone(vaultRegistry);
    return queueStorageWrite(async()=>{
      const db=await openStorageDb();
      const tx=db.transaction(DB_META_STORE,'readwrite');
      tx.objectStore(DB_META_STORE).put({key:DB_REGISTRY_KEY,value:snapshot,updatedAt:new Date().toISOString()});
      await idbTransactionDone(tx);
    }).catch(error=>{
      console.error('Could not save vault registry',error);
      toast('Could not save vault information to IndexedDB.');
    });
  }

  function activeVaultMeta(){ return vaultRegistry.vaults.find(v=>v.id===activeVaultId) || vaultRegistry.vaults[0]; }

  async function loadState(vaultId=activeVaultId){
    try{
      const record=await idbGet(DB_VAULT_STORE,vaultId);
      const parsed=normalizeWorkspace(record?.workspace?clone(record.workspace):clone(DEFAULT_WORKSPACE));
      const meta=vaultRegistry.vaults.find(v=>v.id===vaultId);
      parsed.name=meta?.name||parsed.name||'Vault';
      return parsed;
    }catch(error){
      console.error('Could not load workspace from IndexedDB',error);
      const fallback=normalizeWorkspace(clone(DEFAULT_WORKSPACE));
      fallback.name=vaultRegistry.vaults.find(v=>v.id===vaultId)?.name||'Vault';
      return fallback;
    }
  }

  function persistStateNow(){
    clearTimeout(saveTimer);
    const vaultId=activeVaultId;
    if(!vaultId) return Promise.resolve();
    const snapshot=clone(state);
    return queueStorageWrite(async()=>{
      const db=await openStorageDb();
      const tx=db.transaction(DB_VAULT_STORE,'readwrite');
      tx.objectStore(DB_VAULT_STORE).put({id:vaultId,workspace:snapshot,updatedAt:new Date().toISOString()});
      await idbTransactionDone(tx);
    }).catch(error=>{
      console.error('Could not save workspace to IndexedDB',error);
      toast('Could not save workspace to IndexedDB.');
    });
  }

  function deleteVaultFromStorage(id){
    return queueStorageWrite(async()=>{
      const db=await openStorageDb();
      const tx=db.transaction(DB_VAULT_STORE,'readwrite');
      tx.objectStore(DB_VAULT_STORE).delete(id);
      await idbTransactionDone(tx);
    });
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
      return;
    }
    flushHistoryPending(activeVaultId);
    if(!snapshotsEqual(history.present,current)){
      pushUndoSnapshot(history,history.present);
      history.present=current;
      history.redo=[];
    }
  }

  function scheduleSave(mode='immediate'){
    recordHistory(mode);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persistStateNow, 120);
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
    historySuspended=false; toast('Undo');
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
    historySuspended=false; toast('Redo');
  }

  function renderVaultSelector(){
    if(!els.vaultSelect) return;
    els.vaultSelect.innerHTML=vaultRegistry.vaults.map(v=>`<option value="${escapeHtml(v.id)}">${escapeHtml(v.name)}</option>`).join('');
    els.vaultSelect.value=activeVaultId;
    if(els.deleteVaultBtn) els.deleteVaultBtn.disabled=vaultRegistry.vaults.length===1;
  }

  async function switchVault(id){
    if(!id || id===activeVaultId || !vaultRegistry.vaults.some(v=>v.id===id)) return;
    cancelPageOperations();
    flushHistoryPending(activeVaultId);
    await persistStateNow();
    activeVaultId=id; vaultRegistry.activeVaultId=id;
    await saveVaultRegistry();
    state=await loadState(id); initializeHistoryForVault(activeVaultId); applyTheme(); renderAll();
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

  async function submitVaultDialog(){
    if(!vaultDialogMode || !els.vaultDialogInput) return;
    const name=els.vaultDialogInput.value.trim();
    if(!name){ els.vaultDialogError.textContent='Enter a vault name.'; els.vaultDialogInput.focus(); return; }
    const duplicate=vaultRegistry.vaults.some(v=>v.name.trim().toLowerCase()===name.toLowerCase() && (vaultDialogMode!=='rename' || v.id!==activeVaultId));
    if(duplicate){ els.vaultDialogError.textContent='A vault with this name already exists.'; els.vaultDialogInput.focus(); els.vaultDialogInput.select(); return; }
    if(vaultDialogMode==='create'){
      cancelPageOperations();
      await persistStateNow();
      const id=uid('vault');
      vaultRegistry.vaults.push({id,name}); vaultRegistry.activeVaultId=id; activeVaultId=id;
      await saveVaultRegistry();
      state=makeBlankWorkspace(); state.name=name; initializeHistoryForVault(activeVaultId,{reset:true}); await persistStateNow(); applyTheme(); closeVaultDialog(); renderAll();
      requestAnimationFrame(()=>{ els.pageTitle?.focus(); selectAllContent(els.pageTitle); });
      toast('Vault created');
      return;
    }
    const meta=activeVaultMeta(); if(!meta) return closeVaultDialog();
    if(name!==meta.name){ meta.name=name; state.name=name; await saveVaultRegistry(); await persistStateNow(); renderVaultSelector(); toast('Vault renamed'); }
    closeVaultDialog();
  }

  async function deleteVault(){
    const meta=activeVaultMeta(); if(!meta || vaultRegistry.vaults.length<=1) return;
    if(!confirm(`Delete vault "${meta.name}"? This removes its locally stored pages.`)) return;
    cancelPageOperations();
    await persistStateNow();
    await deleteVaultFromStorage(meta.id);
    const index=vaultRegistry.vaults.findIndex(v=>v.id===meta.id); vaultRegistry.vaults.splice(index,1);
    const next=vaultRegistry.vaults[Math.max(0,index-1)] || vaultRegistry.vaults[0];
    historyByVault.delete(meta.id); activeVaultId=next.id; vaultRegistry.activeVaultId=next.id;
    await saveVaultRegistry();
    state=await loadState(activeVaultId); initializeHistoryForVault(activeVaultId); applyTheme(); renderAll(); toast('Vault deleted');
  }

  function currentPage(){ return state.pages.find(p => p.id === state.currentPageId) || state.pages[0]; }
  function pageById(id){ return state.pages.find(p => p.id === id); }
  function childrenOf(id){ return state.pages.filter(p => p.parentId === id); }

  async function init(){
    // Interaction must never depend on storage initialization. Render and bind
    // immediately, then hydrate the workspace from IndexedDB asynchronously.
    applyTheme();
    bindEvents();
    renderAll();
    try{
      await openStorageDb();
      vaultRegistry=await loadVaultRegistry();
      activeVaultId=vaultRegistry.activeVaultId;
      state=await loadState(activeVaultId);
      if(typeof state.sidebarOpen!=='boolean') state.sidebarOpen=true;
      if(typeof state.rightSidebarOpen!=='boolean') state.rightSidebarOpen=true;
      if(!['files','favorites'].includes(state.leftPanelMode)) state.leftPanelMode='files';
      if(!['outline','backlinks'].includes(state.rightPanelMode)) state.rightPanelMode='outline';
      if(!['page','graph'].includes(state.mainView)) state.mainView='page';
      if(!Number.isFinite(state.sidebarWidth)) state.sidebarWidth=276;
      if(!Number.isFinite(state.rightSidebarWidth)) state.rightSidebarWidth=286;
      initializeHistoryForVault(activeVaultId,{reset:true});
      applyTheme();
      renderAll();
    }catch(error){
      console.error('Novera IndexedDB initialization failed',error);
      renderAll();
      toast('IndexedDB could not be initialized. Changes may not persist.');
    }
  }

  function groupTabs(groupId){ return state.openTabs.filter(tab=>tab.groupId===groupId); }
  function selectedGroupTab(group){
    const tabs=groupTabs(group.id);
    return tabs.find(tab=>tab.id===group.activeTabId)||tabs[0]||null;
  }
  function bindEditorElements(root){
    const mapping={pageTitle:'[data-dock-title]',pageIcon:'[data-dock-icon]',pageComments:'[data-dock-comments]',blockEditor:'[data-dock-blocks]',emptyHint:'[data-dock-empty]'};
    for(const [key,selector] of Object.entries(mapping)) els[key]=root?.querySelector(selector)||baseEditorElements[key];
  }
  function focusEditorGroup(groupId){
    const group=editorGroup(state.editorLayout,groupId); if(!group) return;
    const tab=selectedGroupTab(group); if(!tab) return;
    if(tab.kind==='graph') return;
    if(state.activeEditorGroupId===groupId && state.activeTabId===tab.id) return;
    cancelPageOperations();
    state.activeEditorGroupId=groupId; state.activeTabId=tab.id;
    if(tab.kind==='page'){ state.currentPageId=tab.pageId; state.mainView='page'; }
    bindEditorElements([...els.editorDock.querySelectorAll('[data-dock-page]')].find(root=>root.dataset.editorGroup===groupId));
    els.editorDock.querySelectorAll('.dock-pane').forEach(pane=>pane.classList.toggle('active',pane.dataset.editorGroup===groupId));
    renderTabs(); renderSidebar();
    if(tab.kind==='page'){
      const page=pageById(tab.pageId); renderBreadcrumbs(page);
    }
    renderRightSidebar();
  }
  function dockTabMarkup(tab,active){
    const page=tab.kind==='page'?pageById(tab.pageId):null;
    const title=page?.title|| (tab.kind==='graph'?'Graph view':'Untitled');
    return `<div class="dock-tab ${active?'active':''}" role="tab" aria-selected="${active}" data-tab-id="${tab.id}" draggable="true"><span class="tab-icon">${page?pageIconMarkup(page.icon):'◇'}</span><span class="tab-title">${escapeHtml(title)}</span><button type="button" class="tab-close" data-tab-close="${tab.id}" title="Close ${escapeHtml(title)}">×</button></div>`;
  }
  function dockGroupMarkup(group){
    const tabs=groupTabs(group.id), selected=selectedGroupTab(group), page=selected?.kind==='page'?pageById(selected.pageId):null;
    const content=page?`<div class="dock-scroll"><article class="page dock-page" data-dock-page data-editor-group="${group.id}" data-page-id="${page.id}"><div class="note-inline-header"><button class="page-icon ${page.icon?'':'hidden'}" data-dock-icon title="Change icon">${page.icon?pageIconMarkup(page.icon,''):''}</button><h1 class="page-title" contenteditable="true" spellcheck="true" data-dock-title data-placeholder="Untitled">${escapeHtml(page.title||'')}</h1></div><div class="page-comments hidden" data-dock-comments></div><div class="block-editor" data-dock-blocks></div><div class="empty-hint" data-dock-empty>Type <b>/</b> for commands</div></article></div>`:'<div class="dock-empty">Drag a page tab here or press Ctrl/Cmd+Alt+N to create one.</div>';
    return `<section class="dock-pane ${state.activeEditorGroupId===group.id?'active':''}" data-editor-group="${group.id}"><div class="dock-tabs"><div class="dock-tabs-scroll" role="tablist" aria-label="Open pages in pane">${tabs.map(tab=>dockTabMarkup(tab,tab.id===selected?.id)).join('')}</div><div class="dock-tab-spacer"></div></div><nav class="dock-breadcrumbs breadcrumbs" aria-label="Page path">${page?breadcrumbMarkup(page):''}</nav>${content}</section>`;
  }
  function dockNodeMarkup(node){
    if(node.type==='group') return dockGroupMarkup(node);
    return `<div class="dock-split ${node.direction}" data-dock-split style="--first-size:${Math.round(node.ratio*100)}%"><div class="dock-branch">${dockNodeMarkup(node.first)}</div><div class="dock-divider" data-dock-divider role="separator" aria-orientation="${node.direction==='row'?'vertical':'horizontal'}" title="Drag to resize"></div><div class="dock-branch">${dockNodeMarkup(node.second)}</div></div>`;
  }
  function renderDockLayout(){
    els.homeView.classList.add('hidden'); els.graphView?.classList.add('hidden'); els.editorView.classList.add('hidden'); els.editorDock.classList.remove('hidden');
    els.editorDock.innerHTML=dockNodeMarkup(state.editorLayout);
    els.editorDock.querySelectorAll('[data-dock-page]').forEach(root=>{
      const page=pageById(root.dataset.pageId), blocks=root.querySelector('[data-dock-blocks]');
      if(page && blocks){ if(!page.blocks.length) page.blocks.push(newTextBlock()); blocks.innerHTML=page.blocks.map((block,index)=>blockHTML(block,index,page.blocks)).join(''); root.querySelector('[data-dock-empty]').style.display='none'; }
    });
    const active=[...els.editorDock.querySelectorAll('[data-dock-page]')].find(root=>root.dataset.editorGroup===state.activeEditorGroupId);
    bindEditorElements(active);
    if(active) scheduleMermaidPreviews(active.querySelector('[data-dock-blocks]'));
    const page=currentPage(); if(page) renderBreadcrumbs(page);
    requestAnimationFrame(syncAllSimpleTableHandles);
  }
  function replaceGroupNode(node,id,replacement){
    if(node.type==='group') return node.id===id?replacement:node;
    node.first=replaceGroupNode(node.first,id,replacement); node.second=replaceGroupNode(node.second,id,replacement); return node;
  }
  function removeGroupNode(node,id){
    if(node.type==='group') return node.id===id?null:node;
    const first=removeGroupNode(node.first,id), second=removeGroupNode(node.second,id);
    if(!first) return second; if(!second) return first;
    node.first=first; node.second=second; return node;
  }
  function repairEditorGroups(){
    for(const group of editorGroups(state.editorLayout)){
      const tabs=groupTabs(group.id);
      if(!tabs.some(tab=>tab.id===group.activeTabId)) group.activeTabId=tabs[0]?.id||null;
    }
    for(const group of [...editorGroups(state.editorLayout)]){
      if(editorGroups(state.editorLayout).length>1 && !groupTabs(group.id).length) state.editorLayout=removeGroupNode(state.editorLayout,group.id);
    }
    const active=state.openTabs.find(tab=>tab.id===state.activeTabId);
    if(!active){ const group=editorGroups(state.editorLayout)[0], next=selectedGroupTab(group); state.activeEditorGroupId=group.id; state.activeTabId=next?.id||null; if(next?.kind==='page') state.currentPageId=next.pageId; }
    else state.activeEditorGroupId=active.groupId;
  }
  function splitTab(tabId,targetGroupId,edge){
    let tab=state.openTabs.find(item=>item.id===tabId); const target=editorGroup(state.editorLayout,targetGroupId);
    if(!tab||!target||tab.kind!=='page') return;
    const sourceId=tab.groupId;
    // A single tab can display the same page in two panes, as in Obsidian.
    if(sourceId===targetGroupId && groupTabs(sourceId).length===1){ tab={...tab,id:uid('tab')}; state.openTabs.push(tab); }
    const newGroup={type:'group',id:uid('editor_group'),activeTabId:tab.id};
    const oldGroup={...target};
    state.editorLayout=replaceGroupNode(state.editorLayout,targetGroupId,{type:'split',direction:edge==='left'||edge==='right'?'row':'column',ratio:.5,first:edge==='left'||edge==='top'?newGroup:oldGroup,second:edge==='left'||edge==='top'?oldGroup:newGroup});
    tab.groupId=newGroup.id;
    state.activeEditorGroupId=newGroup.id; state.activeTabId=tab.id; state.currentPageId=tab.pageId; state.mainView='page';
    repairEditorGroups(); scheduleSave(); renderAll();
  }
  function moveTabToGroup(tabId,groupId,beforeTabId=null){
    const tab=state.openTabs.find(item=>item.id===tabId), group=editorGroup(state.editorLayout,groupId); if(!tab||!group) return;
    if(tab.groupId===groupId && beforeTabId===tabId) return;
    state.openTabs=state.openTabs.filter(item=>item.id!==tabId); tab.groupId=groupId;
    const index=beforeTabId?state.openTabs.findIndex(item=>item.id===beforeTabId):-1;
    state.openTabs.splice(index<0?state.openTabs.length:index,0,tab);
    group.activeTabId=tab.id; state.activeEditorGroupId=groupId; state.activeTabId=tab.id;
    if(tab.kind==='page'){ state.currentPageId=tab.pageId; state.mainView='page'; }
    else state.mainView='graph';
    repairEditorGroups(); scheduleSave(); renderAll();
  }
  function splitActiveTab(edge){ if(state.activeTabId) splitTab(state.activeTabId,state.activeEditorGroupId,edge); }
  function resetEditorLayout(){
    state.editorLayout={type:'group',id:MAIN_EDITOR_GROUP,activeTabId:state.activeTabId};
    state.openTabs.forEach(tab=>{ tab.groupId=MAIN_EDITOR_GROUP; });
    state.activeEditorGroupId=MAIN_EDITOR_GROUP; scheduleSave(); renderAll();
  }

  function renderAll(){
    const docked=state.mainView==='page' && state.currentPageId!=='__home__' && editorGroups(state.editorLayout).length>1;
    els.editorTabs.parentElement.classList.toggle('docked',docked);
    renderVaultSelector();
    renderSidebar();
    renderTabs();
    if(state.mainView==='graph') renderGraphView(); else if (state.currentPageId === '__home__') renderHome(); else if(docked) renderDockLayout(); else renderPage();
    renderRightSidebar();
    updateWorkspaceChrome();
  }

  function renderTabs(){
    if (!els.tabsScroll) return;
    const validIds = new Set(state.pages.map(p => p.id));
    const validGroups=new Set(editorGroups(state.editorLayout).map(group=>group.id));
    const fallbackGroup=validGroups.has(state.activeEditorGroupId)?state.activeEditorGroupId:editorGroups(state.editorLayout)[0].id;
    if (!Array.isArray(state.openTabs)) state.openTabs = [];
    state.openTabs = state.openTabs.map(tab => {
      if(typeof tab==='string') return validIds.has(tab)?{id:uid('tab'),kind:'page',pageId:tab,groupId:fallbackGroup}:null;
      if(!tab||typeof tab!=='object') return null;
      const groupId=validGroups.has(tab.groupId)?tab.groupId:fallbackGroup;
      if(tab.kind==='graph'||tab.view==='graph') return {id:tab.id||uid('tab'),kind:'graph',groupId};
      return validIds.has(tab.pageId)?{id:tab.id||uid('tab'),kind:'page',pageId:tab.pageId,groupId}:null;
    }).filter(Boolean);

    if(state.mainView==='graph'){
      let active=state.openTabs.find(t=>t.id===state.activeTabId&&t.kind==='graph') || state.openTabs.find(t=>t.kind==='graph');
      if(!active){ active={id:uid('tab'),kind:'graph',groupId:fallbackGroup}; state.openTabs.push(active); }
      state.activeTabId=active.id; state.activeEditorGroupId=active.groupId;
    } else if (state.currentPageId === '__home__') state.activeTabId = null;
    else if (validIds.has(state.currentPageId)) {
      let active = state.openTabs.find(t => t.id === state.activeTabId && t.kind!=='graph' && t.pageId === state.currentPageId);
      if (!active) active = state.openTabs.find(t => t.kind!=='graph' && t.pageId === state.currentPageId);
      if (!active) { active={id:uid('tab'),kind:'page',pageId:state.currentPageId,groupId:fallbackGroup}; state.openTabs.push(active); }
      state.activeTabId = active.id; state.activeEditorGroupId=active.groupId;
      editorGroup(state.editorLayout,active.groupId).activeTabId=active.id;
    }

    els.tabsScroll.innerHTML = state.openTabs.length ? state.openTabs.map(tab => {
      const active = state.activeTabId === tab.id;
      if(tab.kind==='graph') return `<div class="editor-tab ${active?'active':''}" draggable="true" data-tab-id="${tab.id}" data-tab-kind="graph" role="tab" aria-selected="${active}" title="Graph view"><span class="tab-icon">◇</span><span class="tab-title">Graph view</span><button class="tab-close" data-tab-close="${tab.id}" title="Close" aria-label="Close Graph view">×</button></div>`;
      const p = pageById(tab.pageId); if (!p) return '';
      return `<div class="editor-tab ${active?'active':''}" draggable="true" data-tab-id="${tab.id}" data-tab-kind="page" data-page-id="${tab.pageId}" role="tab" aria-selected="${active}" title="${escapeHtml(p.title||'Untitled')}"><span class="tab-icon">${pageIconMarkup(p.icon)}</span><span class="tab-title">${escapeHtml(p.title||'Untitled')}</span><button class="tab-close" data-tab-close="${tab.id}" title="Close" aria-label="Close ${escapeHtml(p.title||'Untitled')}">×</button></div>`;
    }).join('') : `<div class="tabs-empty">No open pages</div>`;
    requestAnimationFrame(() => els.tabsScroll.querySelector('.editor-tab.active')?.scrollIntoView({block:'nearest', inline:'nearest'}));
  }

  function createTab(pageId, activate=true, groupId=state.activeEditorGroupId){
    if (!pageById(pageId)) return null;
    if (!Array.isArray(state.openTabs)) state.openTabs=[];
    const tab={id:uid('tab'),kind:'page',pageId,groupId}; state.openTabs.push(tab);
    if (activate){ cancelPageOperations(); state.activeEditorGroupId=groupId; editorGroup(state.editorLayout,groupId).activeTabId=tab.id; state.activeTabId=tab.id; state.currentPageId=pageId; state.mainView='page'; }
    return tab;
  }

  function replaceActiveTab(pageId){
    if (!pageById(pageId)) return null;
    if (!Array.isArray(state.openTabs)) state.openTabs=[];
    const tab=state.openTabs.find(t=>t.id===state.activeTabId);
    if (!tab || tab.kind==='graph') return createTab(pageId,true);
    if(tab.pageId!==pageId || state.currentPageId!==pageId) cancelPageOperations();
    tab.kind='page'; tab.pageId=pageId; state.activeEditorGroupId=tab.groupId; editorGroup(state.editorLayout,tab.groupId).activeTabId=tab.id; state.currentPageId=pageId; state.mainView='page'; return tab;
  }

  function activateTab(tabId){
    const tab=(state.openTabs||[]).find(t=>t.id===tabId); if(!tab)return;
    state.activeEditorGroupId=tab.groupId;
    editorGroup(state.editorLayout,tab.groupId).activeTabId=tab.id;
    if(tab.kind==='graph'){
      if(state.activeTabId!==tab.id || state.mainView!=='graph') cancelPageOperations();
      state.activeTabId=tab.id; state.mainView='graph'; scheduleSave(); renderAll(); return;
    }
    if(!pageById(tab.pageId)) return;
    if(state.activeTabId!==tab.id || state.currentPageId!==tab.pageId || state.mainView!=='page') cancelPageOperations();
    state.mainView='page'; state.activeTabId=tab.id; state.currentPageId=tab.pageId; scheduleSave(); renderAll();
  }

  function closeTab(tabId){
    if (!Array.isArray(state.openTabs)) state.openTabs = [];
    const index = state.openTabs.findIndex(t=>t.id===tabId);
    if (index < 0) return;
    const wasActive=state.activeTabId===tabId;
    const groupId=state.openTabs[index].groupId;
    if(wasActive) cancelPageOperations();
    state.openTabs.splice(index, 1);
    if (wasActive){
      const next=groupTabs(groupId)[0] || state.openTabs[Math.min(index,state.openTabs.length-1)] || null;
      if(next?.kind==='graph'){
        state.activeEditorGroupId=next.groupId; state.activeTabId=next.id; state.mainView='graph';
      }else if(next?.pageId && pageById(next.pageId)){
        state.activeEditorGroupId=next.groupId; state.activeTabId=next.id; state.currentPageId=next.pageId; state.mainView='page';
      }else{
        state.activeTabId=null; state.currentPageId='__home__'; state.mainView='page';
      }
    }
    repairEditorGroups();
    scheduleSave(); renderAll();
  }

  function cycleTab(direction=1){
    const tabs = state.openTabs || []; if (!tabs.length) return;
    const current = tabs.findIndex(t=>t.id===state.activeTabId);
    const next = current < 0 ? 0 : (current + direction + tabs.length) % tabs.length;
    activateTab(tabs[next].id);
  }

  function openGraphTab(){
    if(!Array.isArray(state.openTabs)) state.openTabs=[];
    let tab=state.openTabs.find(t=>t.kind==='graph');
    if(!tab){ tab={id:uid('tab'),kind:'graph',groupId:state.activeEditorGroupId}; state.openTabs.push(tab); }
    if(state.activeTabId!==tab.id || state.mainView!=='graph') cancelPageOperations();
    state.activeEditorGroupId=tab.groupId; editorGroup(state.editorLayout,tab.groupId).activeTabId=tab.id; state.activeTabId=tab.id; state.mainView='graph'; scheduleSave(); renderAll();
    return tab;
  }

  function updateSidebarState(){ updateWorkspaceChrome(); }

  function updateWorkspaceChrome(){
    document.documentElement.style.setProperty('--sidebar-width', `${Math.max(210,Math.min(420,state.sidebarWidth||276))}px`);
    document.documentElement.style.setProperty('--right-sidebar-width', `${Math.max(220,Math.min(420,state.rightSidebarWidth||286))}px`);
    els.sidebar?.classList.toggle('collapsed', !state.sidebarOpen);
    els.sidebarOpen?.classList.toggle('hidden', state.sidebarOpen);
    els.rightSidebar?.classList.toggle('collapsed', !state.rightSidebarOpen);
    els.editorTabs?.parentElement.classList.toggle('right-sidebar-collapsed', !state.rightSidebarOpen);
    document.querySelector('.left-resizer')?.classList.toggle('hidden-resizer', !state.sidebarOpen);
    document.querySelector('.right-resizer')?.classList.toggle('hidden-resizer', !state.rightSidebarOpen);
    if (els.rightSidebarToggle){ els.rightSidebarToggle.textContent = state.rightSidebarOpen ? '◨' : '◧'; els.rightSidebarToggle.setAttribute('aria-expanded',String(state.rightSidebarOpen)); }
    document.querySelectorAll('[data-ribbon-action="files"],[data-ribbon-action="favorites"]').forEach(btn=>{
      btn.classList.toggle('active', state.sidebarOpen && btn.dataset.ribbonAction===state.leftPanelMode);
      btn.setAttribute('aria-pressed', btn.classList.contains('active') ? 'true' : 'false');
    });
    const graphButton=document.querySelector('[data-ribbon-action="graph"]');
    if(graphButton){ graphButton.classList.toggle('active',state.mainView==='graph'); graphButton.setAttribute('aria-pressed',state.mainView==='graph'?'true':'false'); }
    requestAnimationFrame(updateSidebarOverflow);
  }

  function renderRightSidebar(){
    if(!els.rightSidebarContent) return;
    document.querySelectorAll('[data-right-mode]').forEach(btn=>btn.classList.toggle('active',btn.dataset.rightMode===state.rightPanelMode));
    if(state.mainView==='graph'){
      const graph=buildPageGraph();
      els.rightSidebarContent.innerHTML=`<div class="right-section-title">Graph</div><div class="right-empty compact"><b>${graph.nodes.length} notes · ${graph.edges.length} links</b><small>Use Link to page blocks to create connections. Click a node in the graph to open it.</small></div>`;
      return;
    }
    if(state.currentPageId==='__home__'){
      els.rightSidebarContent.innerHTML='<div class="right-empty"><div class="right-empty-icon">◇</div><b>No note selected</b><span>Open a page to see its outline and linked mentions.</span></div>';
      return;
    }
    const page=currentPage(); if(!page) return;
    if(state.rightPanelMode==='backlinks'){
      const linked=pagesLinkingTo(page.id);
      const backlinkEmpty=`<div class="right-empty compact"><span>No backlinks yet.</span><small>Add a Link to page block from another note.</small></div>`;
      els.rightSidebarContent.innerHTML=`<div class="right-section-title">Linked mentions</div>${linked.length?linked.map(p=>{ const count=pageLinkCountTo(p,page.id); return `<button class="backlink-item" data-backlink-page="${p.id}"><span>${pageIconMarkup(p.icon)}</span><span><b>${escapeHtml(p.title||'Untitled')}</b><small>${count} link${count===1?'':'s'} · ${countWords(p)} words</small></span></button>`; }).join(''):backlinkEmpty}`;
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

  function wikiTitleKey(value){ return String(value||'').trim().replace(/\s+/g,' ').toLocaleLowerCase(); }
  function blockSearchKey(value){
    return String(value??'').normalize('NFKC').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().replace(/[-_]+/g,' ').replace(/\s+/g,' ').trim();
  }
  function blockTypeMatchesQuery(blockType,query){
    const key=blockSearchKey(query); if(!key) return true;
    const words=blockSearchKey([blockType.name,blockType.desc,blockType.type].filter(Boolean).join(' ')).split(' ').filter(Boolean);
    return key.split(' ').every(token=>words.some(word=>word.startsWith(token)));
  }
  function blockTypeSearchRank(blockType,query){
    const key=blockSearchKey(query), name=blockSearchKey(blockType.name), type=blockSearchKey(blockType.type);
    if(!key) return 0;
    if(name===key) return 0;
    if(name.startsWith(key)) return 1;
    if(type===key || type.startsWith(key)) return 2;
    return 3;
  }

  function pageByTitle(title){
    const key=wikiTitleKey(title); if(!key) return null;
    return state.pages.find(page=>wikiTitleKey(page.title||'Untitled')===key) || null;
  }

  function wikiLinksInText(text){
    const source=String(text||''), links=[];
    const re=/\[\[([^\]\n]+?)\]\]/g; let match;
    while((match=re.exec(source))){
      const body=String(match[1]||'');
      const pipe=body.indexOf('|');
      const targetSpec=(pipe>=0?body.slice(0,pipe):body).trim();
      const label=(pipe>=0?body.slice(pipe+1):targetSpec).trim();
      const hash=targetSpec.indexOf('#');
      const title=(hash>=0?targetSpec.slice(0,hash):targetSpec).trim();
      if(!title) continue;
      const target=pageByTitle(title);
      links.push({start:match.index,end:match.index+match[0].length,raw:match[0],title,label:label||title,pageId:target?.id||null});
    }
    return links;
  }

  function linkedPageIdsFromPage(page){
    const ids=[];
    for(const block of flattenBlocks(page?.blocks||[])){
      if((block?.type==='page' || block?.type==='page-link') && pageById(block.pageId)) ids.push(block.pageId);
      for(const link of inlineLinksForBlock(block)) if(link.pageId && pageById(link.pageId)) ids.push(link.pageId);
      for(const link of wikiLinksInText(`${block?.text||''}\n${block?.caption||''}`)) if(link.pageId) ids.push(link.pageId);
    }
    return ids;
  }

  function pageLinkCountTo(page,targetId){ return linkedPageIdsFromPage(page).filter(id=>id===targetId).length; }
  function pagesLinkingTo(targetId){ return state.pages.filter(page=>page.id!==targetId && pageLinkCountTo(page,targetId)>0); }

  function buildPageGraph(){
    const nodes=state.pages.map(page=>({id:page.id,title:page.title||'Untitled',icon:page.icon||'',current:page.id===state.currentPageId,degree:0}));
    const nodeIds=new Set(nodes.map(node=>node.id)), seen=new Set(), edges=[];
    for(const page of state.pages){
      for(const targetId of linkedPageIdsFromPage(page)){
        if(!nodeIds.has(targetId) || targetId===page.id) continue;
        const key=`${page.id}>${targetId}`; if(seen.has(key)) continue; seen.add(key);
        edges.push({source:page.id,target:targetId});
      }
    }
    const degree=new Map(nodes.map(node=>[node.id,0]));
    for(const edge of edges){ degree.set(edge.source,(degree.get(edge.source)||0)+1); degree.set(edge.target,(degree.get(edge.target)||0)+1); }
    for(const node of nodes) node.degree=degree.get(node.id)||0;
    return {nodes,edges};
  }

  function graphLayout(graph){
    const W=1000,H=700,cx=W/2,cy=H/2,n=graph.nodes.length;
    const positions=new Map();
    if(!n) return positions;
    const radius=Math.min(280,95+Math.sqrt(n)*29);
    graph.nodes.forEach((node,index)=>{
      const angle=(index/n)*Math.PI*2-Math.PI/2;
      const ring=radius*(.7+.3*((index%5)/4));
      positions.set(node.id,{x:cx+Math.cos(angle)*ring,y:cy+Math.sin(angle)*ring,vx:0,vy:0});
    });
    const byId=new Map(graph.nodes.map((node,index)=>[node.id,index]));
    const iterations=n>250?24:n>120?48:110;
    for(let step=0;step<iterations;step++){
      const force=graph.nodes.map(()=>({x:0,y:0}));
      for(let i=0;i<n;i++) for(let j=i+1;j<n;j++){
        const a=positions.get(graph.nodes[i].id),b=positions.get(graph.nodes[j].id);
        let dx=a.x-b.x,dy=a.y-b.y,d2=dx*dx+dy*dy;
        if(d2<4){ dx=(i-j)*.7; dy=(j-i)*.55; d2=dx*dx+dy*dy; }
        const dist=Math.sqrt(d2),strength=Math.min(4.5,5200/d2);
        const fx=(dx/dist)*strength,fy=(dy/dist)*strength;
        force[i].x+=fx; force[i].y+=fy; force[j].x-=fx; force[j].y-=fy;
      }
      for(const edge of graph.edges){
        const ai=byId.get(edge.source),bi=byId.get(edge.target); if(ai==null||bi==null) continue;
        const a=positions.get(edge.source),b=positions.get(edge.target),dx=b.x-a.x,dy=b.y-a.y,dist=Math.max(1,Math.hypot(dx,dy));
        const spring=(dist-145)*.012,fx=(dx/dist)*spring,fy=(dy/dist)*spring;
        force[ai].x+=fx; force[ai].y+=fy; force[bi].x-=fx; force[bi].y-=fy;
      }
      graph.nodes.forEach((node,i)=>{
        const p=positions.get(node.id),f=force[i];
        f.x+=(cx-p.x)*.004; f.y+=(cy-p.y)*.004;
        p.vx=(p.vx+f.x)*.82; p.vy=(p.vy+f.y)*.82;
        p.x=Math.max(35,Math.min(W-35,p.x+p.vx)); p.y=Math.max(30,Math.min(H-30,p.y+p.vy));
      });
    }
    return positions;
  }

  function graphTransform(){ return `translate(${500*(1-graphViewRuntime.scale)} ${350*(1-graphViewRuntime.scale)}) scale(${graphViewRuntime.scale})`; }
  function applyGraphTransform(){ const viewport=els.graphView?.querySelector('[data-graph-viewport]'); if(viewport) viewport.setAttribute('transform',graphTransform()); }

  function setGraphZoom(next){
    graphViewRuntime.scale=Math.max(.55,Math.min(2.4,Number(next)||1));
    applyGraphTransform();
  }

  function applyGraphSearch(value){
    const query=wikiTitleKey(value), root=els.graphView; if(!root) return;
    const matches=new Set();
    root.querySelectorAll('[data-graph-page]').forEach(node=>{
      const match=!query || wikiTitleKey(node.dataset.graphTitle).includes(query);
      node.classList.toggle('dim',!match); if(match) matches.add(node.dataset.graphPage);
    });
    root.querySelectorAll('[data-graph-edge]').forEach(edge=>{
      const dim=!!query && !matches.has(edge.dataset.graphSource) && !matches.has(edge.dataset.graphTarget);
      edge.classList.toggle('dim',dim);
    });
  }

  function renderGraphView(){
    els.editorDock?.classList.add('hidden'); bindEditorElements(null);
    els.editorView.classList.add('hidden'); els.homeView.classList.add('hidden'); els.graphView?.classList.remove('hidden');
    els.breadcrumbs.innerHTML='<span class="crumb">Graph view</span>';
    const graph=buildPageGraph(), positions=graphLayout(graph);
    const pos=id=>positions.get(id)||{x:500,y:350};
    const edges=graph.edges.map(edge=>{ const a=pos(edge.source),b=pos(edge.target); return `<line class="graph-edge" data-graph-edge data-graph-source="${edge.source}" data-graph-target="${edge.target}" x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}"></line>`; }).join('');
    const nodes=graph.nodes.map(node=>{ const p=pos(node.id),r=Math.min(15,6+Math.sqrt(node.degree)*2.1); return `<g class="graph-node ${node.current?'current':''}" data-graph-page="${node.id}" data-graph-title="${escapeHtml(node.title)}" transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})" tabindex="0" role="button" aria-label="Open ${escapeHtml(node.title)}"><circle r="${r.toFixed(1)}"></circle><text x="${(r+6).toFixed(1)}" y="4">${escapeHtml(node.title)}</text></g>`; }).join('');
    els.graphView.innerHTML=`<div class="graph-shell"><div class="graph-toolbar"><div class="graph-title"><b>Graph view</b><span>${graph.nodes.length} notes · ${graph.edges.length} links</span></div><div class="graph-controls"><input class="graph-search" data-graph-search type="search" placeholder="Filter notes…" autocomplete="off"><button class="graph-control-btn" data-graph-zoom-out title="Zoom out">−</button><button class="graph-control-btn" data-graph-fit title="Fit graph">Fit</button><button class="graph-control-btn" data-graph-zoom-in title="Zoom in">＋</button></div></div><div class="graph-stage">${graph.nodes.length?`<svg class="graph-svg" data-graph-svg viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid meet"><g data-graph-viewport transform="${graphTransform()}">${edges}${nodes}</g></svg>`:`<div class="graph-empty"><div><b>No notes yet</b>Create pages and connect them with Link to page blocks.</div></div>`}<div class="graph-legend">Link to page creates a connection · click a node to open</div></div></div>`;
  }

  function openWikiLink(pageId,title,{newTab=false}={}){
    let target=pageId?pageById(pageId):pageByTitle(title);
    if(!target){
      const clean=String(title||'').trim(); if(!clean) return;
      target={id:uid('page'),parentId:null,title:clean,icon:'📄',favorite:false,expanded:true,blocks:[newTextBlock()]};
      state.pages.push(target); toast(`Created ${clean}`);
    }
    state.mainView='page'; openPage(target.id,{newTab});
  }

  function renderHome(){
    els.editorDock?.classList.add('hidden'); bindEditorElements(null);
    els.graphView?.classList.add('hidden');
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
    els.editorDock?.classList.add('hidden'); bindEditorElements(null);
    els.graphView?.classList.add('hidden');
    const page = currentPage();
    if (!page) return;
    els.homeView.classList.add('hidden');
    els.editorView.classList.remove('hidden');
    renderBreadcrumbs(page);
    els.pageTitle.textContent = page.title || '';
    els.pageIcon.innerHTML = page.icon ? pageIconMarkup(page.icon,'') : '';
    els.pageIcon.classList.toggle('hidden', !page.icon);
    els.pageComments.classList.add('hidden');
    renderBlocks(page);
  }

  function breadcrumbMarkup(page){
    const chain=[]; let cur=page;
    while(cur){ chain.unshift(cur); cur=cur.parentId?pageById(cur.parentId):null; }
    return chain.map((p,i) => `<span class="crumb" data-crumb-id="${p.id}"><span class="crumb-icon">${pageIconMarkup(p.icon)}</span>${escapeHtml(p.title||'Untitled')}</span>${i<chain.length-1?'<span class="crumb-sep">/</span>':''}`).join('');
  }
  function renderBreadcrumbs(page){
    els.breadcrumbs.innerHTML=breadcrumbMarkup(page);
    if(!els.editorDock?.classList.contains('hidden')) els.editorDock.querySelectorAll('.dock-pane').forEach(pane=>{
      const group=editorGroup(state.editorLayout,pane.dataset.editorGroup), tab=group&&selectedGroupTab(group);
      if(tab?.pageId===page.id) pane.querySelector('.dock-breadcrumbs').innerHTML=breadcrumbMarkup(page);
    });
  }

  function renderBlocks(page){
    if (!page.blocks.length) page.blocks.push(newTextBlock());
    els.blockEditor.innerHTML = page.blocks.map((b,i) => blockHTML(b,i,page.blocks)).join('');
    els.emptyHint.style.display = 'none';
    scheduleMermaidPreviews(els.blockEditor);
    if(els.editorDock && !els.editorDock.classList.contains('hidden')) refreshOtherDockPages(page.id);
    requestAnimationFrame(syncAllSimpleTableHandles);
    if(page.id===state.currentPageId) renderRightSidebar();
  }

  function refreshOtherDockPages(pageId){
    const page=pageById(pageId); if(!page) return;
    els.editorDock.querySelectorAll('[data-dock-page]').forEach(root=>{
      if(root.dataset.pageId!==pageId || root.dataset.editorGroup===state.activeEditorGroupId) return;
      const blocks=root.querySelector('[data-dock-blocks]');
      if(blocks) blocks.innerHTML=page.blocks.map((block,index)=>blockHTML(block,index,page.blocks)).join('');
    });
  }

  function blockHTML(block, index, blocks){
    if (block.type === 'database') return databaseHTML(block);
    const placeholder = "Type '/' for commands";
    const emptyState = block.text ? 'false' : 'true';
    const gutter = `<div class="block-gutter"><button data-block-action="add" title="Add block">＋</button><button draggable="true" data-block-action="drag" title="Drag / options" aria-label="Drag / options"><svg class="block-drag-icon" viewBox="0 0 12 22" aria-hidden="true" focusable="false"><circle cx="3.5" cy="3.5"/><circle cx="8.5" cy="3.5"/><circle cx="3.5" cy="11"/><circle cx="8.5" cy="11"/><circle cx="3.5" cy="18.5"/><circle cx="8.5" cy="18.5"/></svg></button></div>`;
    if (block.type === 'page') return pageBlockHTML(block, gutter);
    if (block.type === 'page-link') return pageLinkBlockHTML(block, gutter);
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

  function inlineLinkTargetKey(link){ return link?.pageId?`page:${link.pageId}`:`url:${link?.url||''}`; }

  function normalizeInlineLinkRanges(links,textLength){
    const max=Math.max(0,Number(textLength)||0), out=[];
    const source=Array.isArray(links)?links:[];
    for(const item of source){
      const pageId=String(item?.pageId||'').trim();
      const url=pageId?'':normalizeHyperlinkUrl(item?.url); if(!pageId && !url) continue;
      const start=Math.max(0,Math.min(max,Number(item?.start)||0));
      const end=Math.max(start,Math.min(max,Number(item?.end)||0));
      if(end<=start) continue;
      out.push({start,end,...(pageId?{pageId}:{url})});
    }
    out.sort((a,b)=>a.start-b.start || a.end-b.end);
    const clean=[];
    for(const item of out){
      const prev=clean.at(-1);
      if(prev && item.start<prev.end) continue;
      if(prev && item.start===prev.end && inlineLinkTargetKey(item)===inlineLinkTargetKey(prev)){ prev.end=item.end; continue; }
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


  const INLINE_FORMAT_TYPES=new Set(['bold','italic','underline','strike','code','color','background']);
  const INLINE_COLOR_NAMES=new Set(['gray','brown','orange','yellow','green','blue','purple','pink','red']);

  function normalizeInlineFormatRanges(formats,textLength){
    const max=Math.max(0,Number(textLength)||0), source=Array.isArray(formats)?formats:[], out=[];
    for(const item of source){
      const type=String(item?.type||''); if(!INLINE_FORMAT_TYPES.has(type)) continue;
      let value=item?.value==null?'':String(item.value);
      if((type==='color'||type==='background') && !INLINE_COLOR_NAMES.has(value)) continue;
      if(type!=='color'&&type!=='background') value='';
      const start=Math.max(0,Math.min(max,Number(item?.start)||0));
      const end=Math.max(start,Math.min(max,Number(item?.end)||0));
      if(end<=start) continue;
      out.push({start,end,type,...(value?{value}:{})});
    }
    out.sort((a,b)=>a.type.localeCompare(b.type)||(a.value||'').localeCompare(b.value||'')||a.start-b.start||a.end-b.end);
    const merged=[];
    for(const item of out){
      const prev=merged.at(-1);
      if(prev && prev.type===item.type && (prev.value||'')===(item.value||'') && item.start<=prev.end){ prev.end=Math.max(prev.end,item.end); continue; }
      merged.push({...item});
    }
    return merged;
  }

  function inlineFormatsForBlock(block){
    const text=String(block?.text||'');
    const formats=normalizeInlineFormatRanges(block?.inlineFormats,text.length);
    if(block){ if(formats.length) block.inlineFormats=formats; else delete block.inlineFormats; }
    return formats;
  }

  function inlineFormatsFromContent(content,text){
    const formats=[];
    for(const el of content?.querySelectorAll?.('[data-inline-format]')||[]){
      const type=el.dataset.inlineFormat; if(!INLINE_FORMAT_TYPES.has(type)) continue;
      const value=el.dataset.inlineValue||'';
      try{
        const before=document.createRange(); before.selectNodeContents(content); before.setEndBefore(el);
        const start=before.toString().length, end=start+(el.innerText||el.textContent||'').length;
        if(end>start) formats.push({start,end,type,...(value?{value}:{})});
      }catch{}
    }
    return normalizeInlineFormatRanges(formats,String(text||'').length);
  }

  function splitInlineFormatsAt(block,offset){
    const point=Math.max(0,Number(offset)||0), left=[],right=[];
    for(const format of inlineFormatsForBlock(block)){
      if(format.end<=point) left.push({...format});
      else if(format.start>=point) right.push({...format,start:format.start-point,end:format.end-point});
      else {
        if(format.start<point) left.push({...format,end:point});
        if(format.end>point) right.push({...format,start:0,end:format.end-point});
      }
    }
    return {left:normalizeInlineFormatRanges(left,point),right};
  }

  function inlineFormatsAroundRange(block,start,end){
    const text=String(block?.text||''), safeStart=Math.max(0,Math.min(text.length,start)), safeEnd=Math.max(safeStart,Math.min(text.length,end));
    const left=[],right=[];
    for(const format of inlineFormatsForBlock(block)){
      if(format.end<=safeStart) left.push({...format});
      else if(format.start<safeStart) left.push({...format,end:safeStart});
      if(format.start>=safeEnd) right.push({...format,start:format.start-safeEnd,end:format.end-safeEnd});
      else if(format.end>safeEnd) right.push({...format,start:0,end:format.end-safeEnd});
    }
    return {left:normalizeInlineFormatRanges(left,safeStart),right};
  }

  function subtractInlineFormatRange(format,start,end){
    if(format.end<=start || format.start>=end) return [{...format}];
    const pieces=[];
    if(format.start<start) pieces.push({...format,end:start});
    if(format.end>end) pieces.push({...format,start:end});
    return pieces;
  }

  function selectionFullyFormatted(block,start,end,type,value=''){
    if(end<=start) return false;
    const matching=inlineFormatsForBlock(block).filter(f=>f.type===type && (!value || (f.value||'')===value)).sort((a,b)=>a.start-b.start);
    let cursor=start;
    for(const format of matching){
      if(format.end<=cursor) continue;
      if(format.start>cursor) return false;
      cursor=Math.max(cursor,format.end);
      if(cursor>=end) return true;
    }
    return false;
  }

  function setInlineFormatRange(block,start,end,type,value='',mode='toggle'){
    const text=String(block?.text||''), safeStart=Math.max(0,Math.min(text.length,start)), safeEnd=Math.max(safeStart,Math.min(text.length,end));
    if(safeEnd<=safeStart || !INLINE_FORMAT_TYPES.has(type)) return false;
    const current=inlineFormatsForBlock(block), output=[];
    const isChoice=type==='color'||type==='background';
    const targetValue=isChoice?String(value||''):'';
    const removeTarget=mode==='remove' || (!isChoice && mode==='toggle' && selectionFullyFormatted(block,safeStart,safeEnd,type));
    for(const format of current){
      const sameType=format.type===type;
      if(!sameType){ output.push({...format}); continue; }
      if(isChoice || removeTarget){ output.push(...subtractInlineFormatRange(format,safeStart,safeEnd)); }
      else output.push({...format});
    }
    if(!removeTarget && mode!=='remove'){
      if(isChoice){ if(targetValue && INLINE_COLOR_NAMES.has(targetValue)) output.push({start:safeStart,end:safeEnd,type,value:targetValue}); }
      else output.push({start:safeStart,end:safeEnd,type});
    }
    block.inlineFormats=normalizeInlineFormatRanges(output,text.length);
    if(!block.inlineFormats.length) delete block.inlineFormats;
    return true;
  }

  function clearInlineFormattingRange(block,start,end,{links=true}={}){
    const text=String(block?.text||''), safeStart=Math.max(0,Math.min(text.length,start)), safeEnd=Math.max(safeStart,Math.min(text.length,end));
    if(safeEnd<=safeStart) return false;
    const formats=[];
    for(const format of inlineFormatsForBlock(block)) formats.push(...subtractInlineFormatRange(format,safeStart,safeEnd));
    block.inlineFormats=normalizeInlineFormatRanges(formats,text.length); if(!block.inlineFormats.length) delete block.inlineFormats;
    if(links){
      const kept=[];
      for(const link of inlineLinksForBlock(block)){
        if(link.end<=safeStart || link.start>=safeEnd) kept.push({...link});
        else {
          if(link.start<safeStart) kept.push({...link,end:safeStart});
          if(link.end>safeEnd) kept.push({...link,start:safeEnd});
        }
      }
      block.inlineLinks=normalizeInlineLinkRanges(kept,text.length); if(!block.inlineLinks.length) delete block.inlineLinks;
    }
    return true;
  }

  function formatClassName(format){
    if(format.type==='color') return `inline-color-${format.value}`;
    if(format.type==='background') return `inline-bg-${format.value}`;
    return '';
  }

  function wrapInlineSegment(html,formats){
    const byType=type=>formats.find(f=>f.type===type);
    if(byType('code')) html=`<code class="inline-code" data-inline-format="code">${html}</code>`;
    if(byType('strike')) html=`<s data-inline-format="strike">${html}</s>`;
    if(byType('underline')) html=`<span data-inline-format="underline" style="text-decoration:underline">${html}</span>`;
    if(byType('italic')) html=`<em data-inline-format="italic">${html}</em>`;
    if(byType('bold')) html=`<strong data-inline-format="bold">${html}</strong>`;
    const color=byType('color'); if(color) html=`<span data-inline-format="color" data-inline-value="${escapeHtml(color.value)}" class="${formatClassName(color)}">${html}</span>`;
    const bg=byType('background'); if(bg) html=`<span data-inline-format="background" data-inline-value="${escapeHtml(bg.value)}" class="${formatClassName(bg)}">${html}</span>`;
    return html;
  }

  function inlineTextHTML(block){
    const text=String(block?.text||''), links=inlineLinksForBlock(block), formats=inlineFormatsForBlock(block);
    const tokens=links.map(link=>({...link,kind:link.pageId?'page':'external'}));
    for(const wiki of wikiLinksInText(text)){
      if(links.some(link=>wiki.start<link.end && wiki.end>link.start)) continue;
      tokens.push({...wiki,kind:'wiki'});
    }
    const boundaries=new Set([0,text.length]);
    for(const token of tokens){ boundaries.add(token.start); boundaries.add(token.end); }
    for(const format of formats){ boundaries.add(format.start); boundaries.add(format.end); }
    const points=[...boundaries].filter(n=>n>=0&&n<=text.length).sort((a,b)=>a-b);
    if(points.length<=2 && !tokens.length && !formats.length) return escapeHtml(text);
    let html='';
    for(let i=0;i<points.length-1;i++){
      const start=points[i],end=points[i+1]; if(end<=start) continue;
      const piece=text.slice(start,end); if(!piece) continue;
      const activeFormats=formats.filter(format=>format.start<=start && format.end>=end);
      let segment=wrapInlineSegment(escapeHtml(piece),activeFormats);
      const token=tokens.find(item=>item.start<=start && item.end>=end);
      if(token?.kind==='external') segment=`<a class="inline-link" data-inline-link href="${escapeHtml(token.url)}" target="_blank" rel="noopener noreferrer" title="Ctrl/Cmd + click to open">${segment}</a>`;
      else if(token?.kind==='page'){
        const target=pageById(token.pageId), missing=!target;
        segment=`<span class="inline-link inline-page-link ${missing?'unresolved':''}" data-inline-page="${escapeHtml(token.pageId)}" title="Ctrl/Cmd + click to ${missing?'open missing':'open'} page">${segment}</span>`;
      }
      else if(token?.kind==='wiki'){
        const resolved=!!token.pageId;
        segment=`<span class="wiki-link ${resolved?'':'unresolved'}" data-wiki-page-title="${escapeHtml(token.title)}" ${resolved?`data-wiki-page="${token.pageId}"`:''} title="Ctrl/Cmd + click to ${resolved?'open':'create'} ${escapeHtml(token.title)}">${segment}</span>`;
      }
      html+=segment;
    }
    return html;
  }

  function inlineLinksFromContent(content,text){
    const links=[];
    for(const el of content?.querySelectorAll?.('a[data-inline-link],[data-inline-page]')||[]){
      const pageId=String(el.dataset.inlinePage||'').trim();
      const href=pageId?'':normalizeHyperlinkUrl(el.getAttribute('href')||''); if(!pageId && !href) continue;
      try{
        const before=document.createRange(); before.selectNodeContents(content); before.setEndBefore(el);
        const start=before.toString().length, end=start+(el.innerText||el.textContent||'').length;
        if(end>start) links.push({start,end,...(pageId?{pageId}:{url:href})});
      }catch{}
    }
    return normalizeInlineLinkRanges(links,String(text||'').length);
  }

  function splitInlineLinksAt(block,offset){
    const links=inlineLinksForBlock(block), point=Math.max(0,Number(offset)||0), left=[], right=[];
    for(const link of links){
      if(link.end<=point) left.push({...link});
      else if(link.start>=point) right.push({...link,start:link.start-point,end:link.end-point});
      else {
        if(link.start<point) left.push({...link,end:point});
        if(link.end>point) right.push({...link,start:0,end:link.end-point});
      }
    }
    return {left,right};
  }

  function inlineLinksAroundRange(block,start,end){
    const links=inlineLinksForBlock(block), left=[], right=[];
    for(const link of links){
      if(link.end<=start) left.push({...link});
      else if(link.start<start) left.push({...link,end:start});
      if(link.start>=end) right.push({...link,start:link.start-end,end:link.end-end});
      else if(link.end>end) right.push({...link,start:0,end:link.end-end});
    }
    return {left:normalizeInlineLinkRanges(left,start),right};
  }

  function replaceBlockRangeWithInlineLink(block,start,end,label,url){
    const original=String(block?.text||''), safeStart=Math.max(0,Math.min(original.length,start)), safeEnd=Math.max(safeStart,Math.min(original.length,end));
    const inserted=String(label||''), delta=inserted.length-(safeEnd-safeStart), adjusted=[];
    for(const link of inlineLinksForBlock(block)){
      if(link.end<=safeStart) adjusted.push({...link});
      else if(link.start>=safeEnd) adjusted.push({...link,start:link.start+delta,end:link.end+delta});
      else {
        if(link.start<safeStart) adjusted.push({...link,end:safeStart});
        if(link.end>safeEnd){ const tailStart=safeStart+inserted.length; adjusted.push({...link,start:tailStart,end:link.end+delta}); }
      }
    }
    block.text=original.slice(0,safeStart)+inserted+original.slice(safeEnd);
    if(inserted.length) adjusted.push({start:safeStart,end:safeStart+inserted.length,url});
    block.inlineLinks=normalizeInlineLinkRanges(adjusted,block.text.length);
    if(!block.inlineLinks.length) delete block.inlineLinks;
    return safeStart+inserted.length;
  }

  function applyInlineLinkToSelection(block,start,end,target){
    if(end<=start) return false;
    const pageId=typeof target==='object'?String(target?.pageId||'').trim():'';
    const url=pageId?'':normalizeHyperlinkUrl(typeof target==='string'?target:target?.url);
    if(!pageId && !url) return false;
    const kept=inlineLinksForBlock(block).filter(link=>link.end<=start || link.start>=end);
    kept.push({start,end,...(pageId?{pageId}:{url})});
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
    const body=rows.map((row,ri)=>`<tr data-table-row="${ri}">${row.map((cell,ci)=>{
      const header=(block.tableHeaderRow&&ri===0)||(block.tableHeaderColumn&&ci===0);
      const tag=header?'th':'td';
      const rangeSelected=isTableCellInSelection(block.id,ri,ci), rangeAnchor=rangeSelected && tableCellSelection?.start?.row===ri && tableCellSelection?.start?.col===ci;
      return `<${tag} data-table-column="${ci}"><div class="simple-table-cell${rangeSelected?' cell-range-selected':''}${rangeAnchor?' cell-range-anchor':''}" contenteditable="true" spellcheck="true" data-table-cell="${ri}:${ci}">${escapeHtml(cell)}</div></${tag}>`;
    }).join('')}</tr>`).join('');
    const colHandles=Array.from({length:colCount},(_,ci)=>`<button type="button" class="table-axis-handle table-col-handle" draggable="true" data-table-col-menu="${ci}" title="Drag to reorder · click for column options" aria-label="Column ${ci+1}: drag to reorder or click for options">${tableAxisHandleSvg()}</button>`).join('');
    const rowHandles=rows.map((_,ri)=>`<button type="button" class="table-axis-handle table-row-handle" draggable="true" data-table-row-menu="${ri}" title="Drag to reorder · click for row options" aria-label="Row ${ri+1}: drag to reorder or click for options">${tableAxisHandleSvg()}</button>`).join('');
    return `<div class="block-row simple-table-block${selected?' table-selected':''}" data-block-id="${block.id}" data-type="table">${gutter}<div class="simple-table-shell"><span class="simple-table-corner-hit" data-table-corner-select title="Select table" aria-label="Select entire table"></span><div class="simple-table-handle-layer" aria-hidden="false">${colHandles}${rowHandles}</div><div class="simple-table-scroll"><table class="simple-table"><colgroup>${Array.from({length:colCount},()=>'<col>').join('')}</colgroup><tbody>${body}</tbody></table></div><button type="button" class="simple-table-add-column" data-table-add-col title="Add column" aria-label="Add column">＋</button><button type="button" class="simple-table-add-row" data-table-add-row title="Add row" aria-label="Add row">＋</button></div></div>`;
  }

  let simpleTableHandleHover={blockId:null,row:null,col:null};

  function syncSimpleTableHandles(tableBlock){
    if(!tableBlock?.isConnected) return;
    const shell=tableBlock.querySelector('.simple-table-shell');
    const scroll=tableBlock.querySelector('.simple-table-scroll');
    if(!shell||!scroll) return;
    const shellRect=shell.getBoundingClientRect();
    const scrollRect=scroll.getBoundingClientRect();
    const firstRow=tableBlock.querySelector('tr[data-table-row="0"]');
    const cells=firstRow?[...firstRow.querySelectorAll('[data-table-column]')]:[];
    cells.forEach(cell=>{
      const ci=Number(cell.dataset.tableColumn), handle=tableBlock.querySelector(`[data-table-col-menu="${ci}"]`);
      if(!handle) return;
      const rect=cell.getBoundingClientRect();
      const centerX=rect.left+rect.width/2-shellRect.left;
      const topLine=scrollRect.top-shellRect.top;
      handle.style.left=`${centerX}px`;
      handle.style.top=`${topLine}px`;
      const visible=rect.right>scrollRect.left+1 && rect.left<scrollRect.right-1;
      handle.style.visibility=visible?'visible':'hidden';
    });
    tableBlock.querySelectorAll('tr[data-table-row]').forEach(row=>{
      const ri=Number(row.dataset.tableRow), handle=tableBlock.querySelector(`[data-table-row-menu="${ri}"]`);
      const firstCell=row.querySelector('[data-table-column]');
      if(!handle||!firstCell) return;
      const rect=firstCell.getBoundingClientRect();
      const leftLine=scrollRect.left-shellRect.left;
      const centerY=rect.top+rect.height/2-shellRect.top;
      handle.style.left=`${leftLine}px`;
      handle.style.top=`${centerY}px`;
      const visible=rect.bottom>scrollRect.top+1 && rect.top<scrollRect.bottom-1;
      handle.style.visibility=visible?'visible':'hidden';
    });
    const addColumn=tableBlock.querySelector('[data-table-add-col]');
    const table=tableBlock.querySelector('.simple-table');
    if(addColumn&&table){
      const tableRect=table.getBoundingClientRect();
      addColumn.style.left=`${tableRect.right-shellRect.left}px`;
      addColumn.style.top=`${scrollRect.top-shellRect.top}px`;
      addColumn.style.height=`${scrollRect.height}px`;
      const rightEdgeVisible=tableRect.right>=scrollRect.left-1 && tableRect.right<=scrollRect.right+1;
      addColumn.style.visibility=rightEdgeVisible?'visible':'hidden';
    }
  }

  function syncAllSimpleTableHandles(){
    document.querySelectorAll('.simple-table-block[data-block-id]').forEach(syncSimpleTableHandles);
  }

  function setSimpleTableHandleHover(tableBlock,row=null,col=null){
    if(!tableBlock){
      document.querySelectorAll('.table-axis-handle.hover-visible').forEach(el=>el.classList.remove('hover-visible'));
      simpleTableHandleHover={blockId:null,row:null,col:null};
      return;
    }
    const blockId=tableBlock.dataset.blockId||null;
    if(simpleTableHandleHover.blockId===blockId && simpleTableHandleHover.row===row && simpleTableHandleHover.col===col) return;
    document.querySelectorAll('.table-axis-handle.hover-visible').forEach(el=>el.classList.remove('hover-visible'));
    if(Number.isInteger(row)) tableBlock.querySelector(`[data-table-row-menu="${row}"]`)?.classList.add('hover-visible');
    if(Number.isInteger(col)) tableBlock.querySelector(`[data-table-col-menu="${col}"]`)?.classList.add('hover-visible');
    simpleTableHandleHover={blockId,row,col};
  }

  function onSimpleTableHandlePointerMove(e){
    const handle=e.target.closest?.('.table-axis-handle');
    if(handle){
      const tableBlock=handle.closest('.simple-table-block[data-block-id]');
      const row=handle.dataset.tableRowMenu!==undefined?Number(handle.dataset.tableRowMenu):null;
      const col=handle.dataset.tableColMenu!==undefined?Number(handle.dataset.tableColMenu):null;
      setSimpleTableHandleHover(tableBlock,Number.isInteger(row)?row:null,Number.isInteger(col)?col:null);
      return;
    }
    const cell=e.target.closest?.('[data-table-cell]');
    if(cell){
      const tableBlock=cell.closest('.simple-table-block[data-block-id]');
      const pos=tableCellCoordinates(cell);
      setSimpleTableHandleHover(tableBlock,pos?.row??null,pos?.col??null);
      return;
    }
    const tableBlock=e.target.closest?.('.simple-table-block[data-block-id]');
    if(tableBlock){ setSimpleTableHandleHover(tableBlock,null,null); return; }
    setSimpleTableHandleHover(null);
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
      if(block.type==='page-link' && typeof block.pageId!=='string') block.pageId='';
      if(['text','h1','h2','h3','bullet','number','todo','toggle','quote','callout'].includes(block.type)){ inlineLinksForBlock(block); inlineFormatsForBlock(block); }
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


  function pageLinkBlockHTML(block,gutter){
    const target=pageById(block.pageId);
    if(!target){
      return `<div class="block-row page-link-block" data-block-id="${block.id}" data-type="page-link">${gutter}<button class="page-block-link placeholder" data-page-link-choose title="Choose a page to link"><span class="page-block-icon">↗</span><span class="page-block-title">Link to page…</span><span class="page-block-arrow">›</span></button></div>`;
    }
    return `<div class="block-row page-link-block" data-block-id="${block.id}" data-type="page-link">${gutter}<button class="page-block-link" data-page-link-open="${target.id}" title="Open linked page · Middle-click for new tab"><span class="page-block-icon">${pageIconMarkup(target.icon)}</span><span class="page-block-title">${escapeHtml(target.title||'Untitled')}</span><span class="page-block-arrow">›</span></button></div>`;
  }

  function renderPageLinkPickerResults(query=''){
    if(!activePageLinkBlockId) return;
    const list=els.blockMenu.querySelector('[data-page-link-picker-list]'); if(!list) return;
    const key=wikiTitleKey(query);
    const currentId=currentPage()?.id;
    const pages=state.pages.filter(page=>page.id!==currentId && (!key || wikiTitleKey(page.title||'Untitled').includes(key)));
    list.innerHTML=pages.length?pages.map(page=>`<button class="page-link-picker-item" data-page-link-pick="${page.id}"><span class="page-link-picker-icon">${pageIconMarkup(page.icon)}</span><span class="page-link-picker-title">${escapeHtml(page.title||'Untitled')}</span></button>`).join(''):`<div class="page-link-picker-empty">No matching pages.</div>`;
  }

  function showPageLinkPicker(row,id){
    if(!row||!findBlock(id)) return;
    hideFloatingMenus();
    activePageLinkBlockId=id;
    const r=row.getBoundingClientRect(), width=300;
    els.blockMenu.style.width=`${width}px`;
    els.blockMenu.style.left=`${Math.max(8,Math.min(r.left,window.innerWidth-width-8))}px`;
    els.blockMenu.style.top=`${Math.max(8,Math.min(r.bottom+4,window.innerHeight-360))}px`;
    els.blockMenu.innerHTML=`<div class="page-link-picker"><div class="page-link-picker-search-wrap"><input class="page-link-picker-search" data-page-link-search type="search" placeholder="Search pages…" autocomplete="off"></div><div class="page-link-picker-list" data-page-link-picker-list></div></div>`;
    renderPageLinkPickerResults('');
    els.blockMenu.classList.remove('hidden');
    requestAnimationFrame(()=>els.blockMenu.querySelector('[data-page-link-search]')?.focus());
  }

  function setPageLinkTarget(blockId,pageId){
    const block=findBlock(blockId), target=pageById(pageId); if(!block||block.type!=='page-link'||!target) return;
    block.pageId=target.id;
    scheduleSave(); hideFloatingMenus(); renderBlocks(currentPage());
  }

  function imageLinkEditorHTML(block){
    if(activeImageLinkBlockId!==block.id) return '';
    const current = block.src && !block.src.startsWith('data:') ? block.src : '';
    return `<div class="image-url-editor" data-image-url-editor><div class="image-url-row"><input class="image-url-input" data-image-url-input type="url" inputmode="url" autocomplete="off" spellcheck="false" placeholder="https://example.com/image.jpg" value="${escapeHtml(current)}"><button class="image-url-submit" data-image-url-submit>Embed</button><button class="image-url-cancel" data-image-url-cancel>Cancel</button></div><div class="image-url-help">Paste a direct, public image URL. The image is tested before it is saved.</div><div class="image-url-error" data-image-url-error></div></div>`;
  }

  function imageToolIcon(type){
    if(type==='align') return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14"/><path d="M5 12h10"/><path d="M5 17h14"/></svg>`;
    if(type==='caption') return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M7 20h10"/></svg>`;
    if(type==='crop') return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v14a2 2 0 0 0 2 2h12"/><path d="M3 7h14a2 2 0 0 1 2 2v12"/></svg>`;
    if(type==='download') return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11"/><path d="M8 11l4 4 4-4"/><path d="M5 20h14"/></svg>`;
    if(type==='left') return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5v14"/><rect x="8" y="7" width="10" height="10" rx="1"/></svg>`;
    if(type==='right') return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 5v14"/><rect x="6" y="7" width="10" height="10" rx="1"/></svg>`;
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5v14"/><path d="M20 5v14"/><rect x="7" y="7" width="10" height="10" rx="1"/></svg>`;
  }

  function imageDisplayWidth(block){
    const value=Number(block.imageWidth);
    return Number.isFinite(value) && value>80 ? Math.round(value) : null;
  }

  function imageAlignment(block){
    return ['left','center','right'].includes(block.imageAlign)?block.imageAlign:'center';
  }

  function normalizedImageCrop(block){
    const raw=block.imageCrop&&typeof block.imageCrop==='object'?block.imageCrop:{};
    const originalAspect=Math.max(.2,Math.min(5,Number(raw.originalAspect)||1));
    const shape=raw.shape==='circle'?'circle':'rect';
    const aspectRaw=shape==='circle'?1:(Number(raw.aspect)||originalAspect);
    return {
      enabled:!!raw.enabled,
      shape,
      aspect:Math.max(.2,Math.min(5,aspectRaw)),
      originalAspect,
      zoom:Math.max(1,Math.min(3,Number(raw.zoom)||1)),
      x:Math.max(0,Math.min(100,Number.isFinite(Number(raw.x))?Number(raw.x):50)),
      y:Math.max(0,Math.min(100,Number.isFinite(Number(raw.y))?Number(raw.y):50))
    };
  }

  async function downloadImageBlock(id){
    const b=findBlock(id); if(!b?.src) return;
    const fallback=()=>{ const a=document.createElement('a'); a.href=b.src; a.target='_blank'; a.rel='noopener noreferrer'; a.download='image'; document.body.appendChild(a); a.click(); a.remove(); };
    try{
      const response=await fetch(b.src); if(!response.ok) throw new Error('download');
      const blob=await response.blob();
      const url=URL.createObjectURL(blob); const a=document.createElement('a');
      const ext=(blob.type.split('/')[1]||'png').replace('jpeg','jpg').split('+')[0];
      a.href=url; a.download=`image.${ext}`; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch{ fallback(); }
  }

  function setImageAlignment(id,align){
    if(!['left','center','right'].includes(align)) return;
    const b=findBlock(id); if(!b) return;
    b.imageAlign=align; scheduleSave();
    const row=document.querySelector(`.block-row[data-block-id="${id}"]`);
    const figure=row?.querySelector('.image-figure');
    if(figure){ figure.classList.remove('align-left','align-center','align-right'); figure.classList.add(`align-${align}`); }
    row?.querySelector('[data-image-align-menu]')?.classList.add('hidden');
    row?.querySelectorAll('[data-image-align-choice]').forEach(btn=>btn.classList.toggle('active',btn.dataset.imageAlignChoice===align));
  }

  function toggleImageCaption(id){
    const b=findBlock(id); if(!b) return;
    const wasVisible=b.showCaption!==false && (b.showCaption===true || !!String(b.caption||''));
    b.showCaption=!wasVisible;
    scheduleSave(); renderBlocks(currentPage());
    if(!wasVisible) requestAnimationFrame(()=>{ const cap=document.querySelector(`.block-row[data-block-id="${id}"] [data-image-caption]`); cap?.focus(); });
  }

  function openImageCrop(id){
    const b=findBlock(id); if(!b) return;
    const row=document.querySelector(`.block-row[data-block-id="${id}"]`);
    const source=row?.querySelector('.image-preview img');
    const rect=source?.getBoundingClientRect();
    const current=b.imageCrop&&typeof b.imageCrop==='object'?JSON.parse(JSON.stringify(b.imageCrop)):null;
    const naturalAspect=source?.naturalWidth&&source?.naturalHeight?source.naturalWidth/source.naturalHeight:0;
    const derivedAspect=naturalAspect || (rect?.height>0?rect.width/rect.height:1);
    imageCropSession={id,original:current};
    const crop=normalizedImageCrop(b);
    if(!crop.enabled) b.imageCrop={enabled:true,originalAspect:derivedAspect,aspect:derivedAspect,zoom:1,x:50,y:50};
    else b.imageCrop={...crop,originalAspect:crop.originalAspect||derivedAspect,enabled:true};
    activeImageCropBlockId=id;
    renderBlocks(currentPage());
    scheduleImageCropDialogLayout(id);
  }

  function applyImageCropPreview(row,block){
    const crop=normalizedImageCrop(block), preview=row?.querySelector('.image-preview'), img=preview?.querySelector('img');
    if(!preview||!img) return;
    preview.classList.toggle('crop-active',crop.enabled);
    preview.classList.toggle('crop-circle',crop.enabled && crop.shape==='circle');
    if(crop.enabled){
      preview.style.aspectRatio=String(crop.aspect);
      preview.style.borderRadius=crop.shape==='circle'?'50%':'4px';
      preview.style.clipPath=crop.shape==='circle'?'circle(50% at 50% 50%)':'none';
      preview.style.webkitClipPath=crop.shape==='circle'?'circle(50% at 50% 50%)':'none';
      img.style.borderRadius=crop.shape==='circle'?'50%':'4px';
      img.style.objectPosition=`${crop.x}% ${crop.y}%`;
      img.style.transform=`scale(${crop.zoom})`;
    }else{
      preview.style.removeProperty('aspect-ratio'); preview.style.removeProperty('border-radius'); preview.style.removeProperty('clip-path'); preview.style.removeProperty('-webkit-clip-path');
      img.style.removeProperty('border-radius'); img.style.removeProperty('object-position'); img.style.removeProperty('transform');
    }
    row.querySelector('[data-image-crop-zoom-value]')?.replaceChildren(document.createTextNode(`${crop.zoom.toFixed(1)}×`));
    row.querySelector('[data-image-crop-x-value]')?.replaceChildren(document.createTextNode(`${Math.round(crop.x)}%`));
    row.querySelector('[data-image-crop-y-value]')?.replaceChildren(document.createTextNode(`${Math.round(crop.y)}%`));
  }

  function updateImageCropControl(input){
    const row=input.closest('.image-block'), b=findBlock(row?.dataset.blockId); if(!b) return;
    const crop=normalizedImageCrop(b);
    if(input.matches('[data-image-crop-zoom]')) crop.zoom=Number(input.value);
    if(input.matches('[data-image-crop-x]')) crop.x=Number(input.value);
    if(input.matches('[data-image-crop-y]')) crop.y=Number(input.value);
    b.imageCrop={...crop,enabled:true};
    applyImageCropPreview(row,b);
  }

  function setImageCropAspect(id,ratio){
    const b=findBlock(id); if(!b) return;
    const crop=normalizedImageCrop(b);
    let next=crop.aspect, shape='rect';
    if(ratio==='original') next=crop.originalAspect;
    else if(ratio==='circle'){ next=1; shape='circle'; }
    else next=Number(ratio);
    if(!Number.isFinite(next)||next<=0) return;
    b.imageCrop={...crop,enabled:true,shape,aspect:next};
    const row=document.querySelector(`.block-row[data-block-id="${id}"]`); applyImageCropPreview(row,b);
    row?.querySelectorAll('[data-image-crop-aspect]').forEach(btn=>{
      const value=btn.dataset.imageCropAspect;
      const isActive=value==='circle' ? shape==='circle' : (shape!=='circle' && Math.abs((value==='original'?crop.originalAspect:Number(value))-next)<.01);
      btn.classList.toggle('active',isActive);
    });
    row?.querySelector('[data-image-crop-aspect-menu]')?.classList.add('hidden');
    scheduleImageCropDialogLayout(id);
  }

  function scheduleImageCropDialogLayout(id){
    requestAnimationFrame(()=>{
      const row=document.querySelector(`.block-row[data-block-id="${id}"]`);
      const img=row?.querySelector('[data-image-crop-source]');
      if(!img) return;
      const draw=()=>layoutImageCropDialog(id);
      if(img.complete && img.naturalWidth) draw(); else img.addEventListener('load',draw,{once:true});
    });
  }

  function cropDialogGeometry(id){
    const row=document.querySelector(`.block-row[data-block-id="${id}"]`);
    const stage=row?.querySelector('[data-image-crop-stage]'), img=row?.querySelector('[data-image-crop-source]'), frame=row?.querySelector('[data-image-crop-frame]');
    if(!stage||!img||!frame) return null;
    const sr=stage.getBoundingClientRect(), ir=img.getBoundingClientRect(), fr=frame.getBoundingClientRect();
    return {row,stage,img,frame,sr,ir,fr,imgLeft:ir.left-sr.left,imgTop:ir.top-sr.top};
  }

  function cropMaxFit(imageWidth,imageHeight,aspect){
    let width=imageWidth, height=width/aspect;
    if(height>imageHeight){ height=imageHeight; width=height*aspect; }
    return {width,height};
  }

  function layoutImageCropDialog(id){
    const b=findBlock(id), g=cropDialogGeometry(id); if(!b||!g) return;
    const crop=normalizedImageCrop(b), max=cropMaxFit(g.ir.width,g.ir.height,crop.aspect);
    const width=Math.max(56,max.width/crop.zoom), height=Math.max(56,max.height/crop.zoom);
    const travelX=Math.max(0,g.ir.width-width), travelY=Math.max(0,g.ir.height-height);
    const left=g.imgLeft+travelX*(crop.x/100), top=g.imgTop+travelY*(crop.y/100);
    Object.assign(g.frame.style,{left:`${left}px`,top:`${top}px`,width:`${Math.min(width,g.ir.width)}px`,height:`${Math.min(height,g.ir.height)}px`});
    g.frame.classList.toggle('circle', crop.shape==='circle');
  }

  function updateCropFromDialogFrame(id,left,top,width,height,g){
    const b=findBlock(id); if(!b) return;
    const aspect=Math.max(.2,Math.min(5,width/Math.max(1,height)));
    const max=cropMaxFit(g.ir.width,g.ir.height,aspect);
    const zoom=Math.max(1,Math.min(3,max.width/Math.max(1,width)));
    const actualWidth=max.width/zoom, actualHeight=max.height/zoom;
    const travelX=Math.max(0,g.ir.width-actualWidth), travelY=Math.max(0,g.ir.height-actualHeight);
    const x=travelX?((left-g.imgLeft)/travelX)*100:50;
    const y=travelY?((top-g.imgTop)/travelY)*100:50;
    const base=normalizedImageCrop(b);
    b.imageCrop={...base,enabled:true,aspect,zoom,x:Math.max(0,Math.min(100,x)),y:Math.max(0,Math.min(100,y))};
    layoutImageCropDialog(id);
  }

  function startImageCropFrameMove(frame,id,event){
    const g=cropDialogGeometry(id); if(!g) return;
    event.preventDefault(); event.stopPropagation();
    const startX=event.clientX,startY=event.clientY;
    const startLeft=g.fr.left-g.sr.left,startTop=g.fr.top-g.sr.top,width=g.fr.width,height=g.fr.height;
    const minLeft=g.imgLeft,maxLeft=g.imgLeft+g.ir.width-width,minTop=g.imgTop,maxTop=g.imgTop+g.ir.height-height;
    const move=ev=>{
      const left=Math.max(minLeft,Math.min(maxLeft,startLeft+ev.clientX-startX));
      const top=Math.max(minTop,Math.min(maxTop,startTop+ev.clientY-startY));
      g.frame.style.left=`${left}px`; g.frame.style.top=`${top}px`;
      updateCropFromDialogFrame(id,left,top,width,height,g);
    };
    const up=()=>{ window.removeEventListener('mousemove',move,true); window.removeEventListener('mouseup',up,true); };
    window.addEventListener('mousemove',move,true); window.addEventListener('mouseup',up,true);
  }

  function startImageCropFrameResize(handle,id,event){
    const g=cropDialogGeometry(id); if(!g) return;
    event.preventDefault(); event.stopPropagation();
    const dir=handle.dataset.imageCropHandle||'', startX=event.clientX,startY=event.clientY;
    const base={left:g.fr.left-g.sr.left,top:g.fr.top-g.sr.top,right:g.fr.right-g.sr.left,bottom:g.fr.bottom-g.sr.top};
    const bounds={left:g.imgLeft,top:g.imgTop,right:g.imgLeft+g.ir.width,bottom:g.imgTop+g.ir.height};
    const minSize=56;
    const move=ev=>{
      const dx=ev.clientX-startX,dy=ev.clientY-startY; let {left,top,right,bottom}=base;
      if(dir.includes('w')) left=Math.max(bounds.left,Math.min(right-minSize,base.left+dx));
      if(dir.includes('e')) right=Math.min(bounds.right,Math.max(left+minSize,base.right+dx));
      if(dir.includes('n')) top=Math.max(bounds.top,Math.min(bottom-minSize,base.top+dy));
      if(dir.includes('s')) bottom=Math.min(bounds.bottom,Math.max(top+minSize,base.bottom+dy));
      updateCropFromDialogFrame(id,left,top,right-left,bottom-top,g);
    };
    const up=()=>{ window.removeEventListener('mousemove',move,true); window.removeEventListener('mouseup',up,true); };
    window.addEventListener('mousemove',move,true); window.addEventListener('mouseup',up,true);
  }

  function resetImageCrop(id){
    const b=findBlock(id); if(!b) return;
    const crop=normalizedImageCrop(b);
    b.imageCrop={...crop,enabled:true,aspect:crop.originalAspect,zoom:1,x:50,y:50};
    renderBlocks(currentPage());
  }

  function applyImageCrop(id){
    if(activeImageCropBlockId!==id) return;
    activeImageCropBlockId=null; imageCropSession=null; scheduleSave(); renderBlocks(currentPage());
  }

  function cancelImageCrop(id){
    const b=findBlock(id); if(!b) return;
    if(imageCropSession?.id===id){
      if(imageCropSession.original) b.imageCrop=imageCropSession.original; else delete b.imageCrop;
    }
    activeImageCropBlockId=null; imageCropSession=null; renderBlocks(currentPage());
  }

  function imageCropPanelHTML(block){
    if(activeImageCropBlockId!==block.id) return '';
    const crop=normalizedImageCrop(block);
    const active=(ratio)=>Math.abs(crop.aspect-ratio)<.01?' active':'';
    return `<div class="image-crop-backdrop" data-image-crop-backdrop><div class="image-crop-dialog" data-image-crop-dialog><div class="image-crop-header"><div class="image-crop-header-left"><button class="image-crop-aspect-trigger" data-image-crop-aspect-toggle title="Aspect ratio"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="11" height="11" rx="1.5"/><rect x="9" y="8" width="11" height="11" rx="1.5"/></svg>${chevronSvg()}</button><div class="image-crop-aspect-menu hidden" data-image-crop-aspect-menu><button data-image-crop-aspect="original" class="${crop.shape!=='circle' && Math.abs(crop.aspect-crop.originalAspect)<.01?'active':''}">Original</button><button data-image-crop-aspect="1" class="${crop.shape!=='circle' ? active(1) : ''}">Square</button><button data-image-crop-aspect="circle" class="${crop.shape==='circle'?'active':''}">Circle</button><button data-image-crop-aspect="1.333333" class="${crop.shape!=='circle' ? active(1.333333) : ''}">4:3</button><button data-image-crop-aspect="1.777778" class="${crop.shape!=='circle' ? active(1.777778) : ''}">16:9</button></div></div><div class="image-crop-header-title">Crop image</div><div class="image-crop-header-right"><button data-image-crop-cancel>Cancel</button><button class="image-crop-save" data-image-crop-apply>Save</button></div></div><div class="image-crop-stage-wrap"><div class="image-crop-stage" data-image-crop-stage><img class="image-crop-stage-image" data-image-crop-source src="${escapeHtml(block.src)}" alt=""><div class="image-crop-frame" data-image-crop-frame><button class="image-crop-handle corner nw" data-image-crop-handle="nw" aria-label="Resize crop"></button><button class="image-crop-handle edge n" data-image-crop-handle="n" aria-label="Resize crop"></button><button class="image-crop-handle corner ne" data-image-crop-handle="ne" aria-label="Resize crop"></button><button class="image-crop-handle edge e" data-image-crop-handle="e" aria-label="Resize crop"></button><button class="image-crop-handle corner se" data-image-crop-handle="se" aria-label="Resize crop"></button><button class="image-crop-handle edge s" data-image-crop-handle="s" aria-label="Resize crop"></button><button class="image-crop-handle corner sw" data-image-crop-handle="sw" aria-label="Resize crop"></button><button class="image-crop-handle edge w" data-image-crop-handle="w" aria-label="Resize crop"></button></div><div class="image-crop-stage-hint">Drag to reposition</div></div></div></div></div>`;
  }

  function imageHTML(block, gutter){
    const caption=escapeHtml(block.caption||'');
    const linkEditor=imageLinkEditorHTML(block);
    if(!block.src){
      return `<div class="block-row image-block" data-block-id="${block.id}" data-type="image">${gutter}<div class="image-block-body"><div class="image-empty"><div class="image-empty-icon">🖼️</div><div class="image-empty-copy"><div class="image-empty-title">Add an image</div><div class="image-empty-sub">Upload from your device or embed with a link.</div></div><div class="image-buttons"><button class="image-action-btn" data-image-upload>Upload</button><button class="image-action-btn" data-image-url>Embed link</button></div></div>${linkEditor}</div></div>`;
    }
    const width=imageDisplayWidth(block), align=imageAlignment(block), crop=normalizedImageCrop(block);
    const widthStyle=width?` style="width:${width}px"`:'';
    const cropClass=crop.enabled?` crop-active${crop.shape==='circle'?' crop-circle':''}`:'';
    const previewStyle=crop.enabled
      ?` style="aspect-ratio:${crop.aspect};${crop.shape==='circle'?'border-radius:50%;clip-path:circle(50% at 50% 50%);-webkit-clip-path:circle(50% at 50% 50%);':''}"`
      :'';
    const imgStyle=crop.enabled
      ?` style="object-position:${crop.x}% ${crop.y}%;transform:scale(${crop.zoom});${crop.shape==='circle'?'border-radius:50%;':''}"`
      :'';
    const captionVisible=block.showCaption!==false && (block.showCaption===true || !!String(block.caption||''));
    const cropOpen=activeImageCropBlockId===block.id;
    return `<div class="block-row image-block" data-block-id="${block.id}" data-type="image">${gutter}<div class="image-block-body"><figure class="image-figure align-${align}"><div class="image-preview-shell${cropOpen?' image-ui-open':''}"${widthStyle}><div class="image-toolbar"><button class="image-tool-btn" data-image-align title="Alignment">${imageToolIcon('align')}</button><button class="image-tool-btn${captionVisible?' active':''}" data-image-caption-toggle title="Caption">${imageToolIcon('caption')}</button><button class="image-tool-btn${crop.enabled?' active':''}" data-image-crop title="Crop">${imageToolIcon('crop')}</button><div class="image-toolbar-sep"></div><button class="image-tool-btn" data-image-download title="Download">${imageToolIcon('download')}</button></div><div class="image-align-toolbar hidden" data-image-align-menu><button class="image-tool-btn${align==='left'?' active':''}" data-image-align-choice="left" title="Align left">${imageToolIcon('left')}</button><button class="image-tool-btn${align==='center'?' active':''}" data-image-align-choice="center" title="Align center">${imageToolIcon('center')}</button><button class="image-tool-btn${align==='right'?' active':''}" data-image-align-choice="right" title="Align right">${imageToolIcon('right')}</button></div>${imageCropPanelHTML(block)}<button class="image-resize-handle left" data-image-resize="left" aria-label="Resize image"></button><div class="image-preview${cropClass}"${previewStyle}><img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt||block.caption||'Image')}" loading="lazy" decoding="async"${imgStyle}></div><button class="image-resize-handle right" data-image-resize="right" aria-label="Resize image"></button>${captionVisible?`<figcaption class="image-caption" contenteditable="true" data-image-caption data-placeholder="Write a caption…">${caption}</figcaption>`:''}</div>${linkEditor}</figure></div></div>`;
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


  function blockTypeLabel(type){
    return ({text:'Normal text',h1:'Heading 1',h2:'Heading 2',h3:'Heading 3',bullet:'Bulleted list',number:'Numbered list',todo:'To-do list',toggle:'Toggle list',quote:'Quote',callout:'Callout'})[type]||'Normal text';
  }

  function textNodePointForOffset(root,offset){
    const target=Math.max(0,Number(offset)||0), walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT); let node,seen=0,last=null;
    while((node=walker.nextNode())){ last=node; const next=seen+(node.nodeValue||'').length; if(target<=next) return {node,offset:Math.max(0,target-seen)}; seen=next; }
    return last?{node:last,offset:(last.nodeValue||'').length}:{node:root,offset:0};
  }

  function selectTextOffsets(root,start,end){
    if(!root) return false;
    const a=textNodePointForOffset(root,start), b=textNodePointForOffset(root,end); if(!a||!b) return false;
    try{ const range=document.createRange(); range.setStart(a.node,a.offset); range.setEnd(b.node,b.offset); const sel=window.getSelection(); sel.removeAllRanges(); sel.addRange(range); return true; }catch{return false;}
  }

  function captureInlineSelection(){
    const sel=window.getSelection(); if(!sel?.rangeCount || sel.isCollapsed) return null;
    const range=sel.getRangeAt(0);
    const startEl=range.startContainer.nodeType===Node.ELEMENT_NODE?range.startContainer:range.startContainer.parentElement;
    const endEl=range.endContainer.nodeType===Node.ELEMENT_NODE?range.endContainer:range.endContainer.parentElement;
    const content=startEl?.closest?.('.block-content[contenteditable="true"]');
    const endContent=endEl?.closest?.('.block-content[contenteditable="true"]');
    if(!content || content!==endContent || !els.blockEditor?.contains(content)) return null;
    const row=content.closest('.block-row[data-block-id]'), block=findBlock(row?.dataset.blockId);
    if(!row || !block || !isTextLikeBlock(block)) return null;
    const start=localTextOffset(content,range.startContainer,range.startOffset), end=localTextOffset(content,range.endContainer,range.endOffset);
    if(end<=start) return null;
    const rect=range.getBoundingClientRect();
    return {blockId:block.id,start,end,content,rect:{left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,width:rect.width,height:rect.height}};
  }

  function activeSelectionLink(block,start,end){
    return inlineLinksForBlock(block).find(link=>link.start<=start && link.end>=end) || null;
  }

  function closeTextFormatPopovers(except=''){
    const toolbar=els.textFormatToolbar; if(!toolbar) return;
    const map={type:'[data-format-type-menu]',color:'[data-format-color-menu]',link:'[data-format-link-popover]',more:'[data-format-more-menu]'};
    for(const [key,selector] of Object.entries(map)) if(key!==except) toolbar.querySelector(selector)?.classList.add('hidden');
  }

  function positionTextFormatToolbar(rect=inlineSelectionState?.rect){
    const toolbar=els.textFormatToolbar; if(!toolbar || !rect || toolbar.classList.contains('hidden')) return;
    const box=toolbar.getBoundingClientRect(), margin=8;
    let left=rect.left+(rect.width-box.width)/2; left=Math.max(margin,Math.min(window.innerWidth-box.width-margin,left));
    let top=rect.top-box.height-8; if(top<margin) top=rect.bottom+8; top=Math.max(margin,Math.min(window.innerHeight-box.height-margin,top));
    toolbar.style.left=`${Math.round(left)}px`; toolbar.style.top=`${Math.round(top)}px`;
  }

  function updateTextFormatToolbarState(){
    const toolbar=els.textFormatToolbar, selection=inlineSelectionState; if(!toolbar||!selection) return;
    const block=findBlock(selection.blockId); if(!block) return;
    const label=toolbar.querySelector('[data-format-type-label]'); if(label) label.textContent=blockTypeLabel(block.type);
    toolbar.querySelectorAll('[data-format-block-type]').forEach(btn=>btn.classList.toggle('active',btn.dataset.formatBlockType===block.type));
    toolbar.querySelectorAll('[data-format-inline]').forEach(btn=>btn.classList.toggle('active',selectionFullyFormatted(block,selection.start,selection.end,btn.dataset.formatInline)));
    toolbar.querySelector('[data-format-link-toggle]')?.classList.toggle('active',!!activeSelectionLink(block,selection.start,selection.end));
  }

  function showTextFormatToolbar(selection=captureInlineSelection()){
    if(!selection){ hideTextFormatToolbar(); return; }
    inlineSelectionState=selection;
    const toolbar=els.textFormatToolbar; if(!toolbar) return;
    toolbar.classList.remove('hidden'); closeTextFormatPopovers(); updateTextFormatToolbarState();
    requestAnimationFrame(()=>positionTextFormatToolbar(selection.rect));
  }

  function hideTextFormatToolbar({clear=true}={}){
    const toolbar=els.textFormatToolbar; if(toolbar){ toolbar.classList.add('hidden'); closeTextFormatPopovers(); }
    if(clear) inlineSelectionState=null;
  }

  function onInlineSelectionPointerDown(event){
    if(event.button!==0 || !event.target.closest?.('.block-content[contenteditable="true"]')) return;
    inlinePointerSelectionActive=true;
    clearTimeout(inlineSelectionUpdateTimer);
    hideTextFormatToolbar();
  }

  function onInlineSelectionPointerEnd(){
    if(!inlinePointerSelectionActive) return;
    inlinePointerSelectionActive=false;
    scheduleTextFormatToolbarFromSelection();
  }

  function onInlineSelectionKeyDown(event){
    if(!event.shiftKey || !event.target.closest?.('.block-content[contenteditable="true"]') || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(event.key)) return;
    inlineKeyboardSelectionActive=true;
    clearTimeout(inlineSelectionUpdateTimer);
    hideTextFormatToolbar();
  }

  function onInlineSelectionKeyUp(event){
    if(!inlineKeyboardSelectionActive || (event.key!=='Shift' && event.shiftKey)) return;
    inlineKeyboardSelectionActive=false;
    scheduleTextFormatToolbarFromSelection();
  }

  function onInlineSelectionInteractionBlur(){
    inlinePointerSelectionActive=false;
    inlineKeyboardSelectionActive=false;
    scheduleTextFormatToolbarFromSelection();
  }

  function scheduleTextFormatToolbarFromSelection(){
    clearTimeout(inlineSelectionUpdateTimer);
    if(inlinePointerSelectionActive || inlineKeyboardSelectionActive) return;
    inlineSelectionUpdateTimer=setTimeout(()=>{
      inlineSelectionUpdateTimer=null;
      if(inlinePointerSelectionActive || inlineKeyboardSelectionActive) return;
      if(els.textFormatToolbar?.contains(document.activeElement)) return;
      if(multiBlockSelection?.active){ hideTextFormatToolbar(); return; }
      const selection=captureInlineSelection();
      if(selection) showTextFormatToolbar(selection); else hideTextFormatToolbar();
    },100);
  }

  function restoreInlineSelection(selection=inlineSelectionState,{show=true}={}){
    if(!selection) return;
    requestAnimationFrame(()=>{
      const content=document.querySelector(`.block-row[data-block-id="${selection.blockId}"] .block-content[contenteditable="true"]`);
      if(!content) return;
      content.focus({preventScroll:true});
      selectTextOffsets(content,selection.start,selection.end);
      const range=window.getSelection()?.rangeCount?window.getSelection().getRangeAt(0):null;
      if(range){ const rect=range.getBoundingClientRect(); selection.content=content; selection.rect={left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,width:rect.width,height:rect.height}; }
      if(show) showTextFormatToolbar(selection);
    });
  }

  function commitInlineFormatting(selection=inlineSelectionState){
    if(!selection) return;
    scheduleSave(); renderBlocks(currentPage()); restoreInlineSelection({...selection});
  }

  function applyInlineToolbarFormat(type){
    const selection=inlineSelectionState, block=findBlock(selection?.blockId); if(!selection||!block) return;
    if(setInlineFormatRange(block,selection.start,selection.end,type,'','toggle')) commitInlineFormatting(selection);
  }

  function applyInlineToolbarChoice(type,value){
    const selection=inlineSelectionState, block=findBlock(selection?.blockId); if(!selection||!block) return;
    setInlineFormatRange(block,selection.start,selection.end,type,value,value==='default'?'remove':'set');
    closeTextFormatPopovers(); commitInlineFormatting(selection);
  }

  function transformInlineSelectionBlock(type){
    const selection=inlineSelectionState, location=findBlockLocation(selection?.blockId), block=location?.block; if(!selection||!block) return;
    const allowed=new Set(['text','h1','h2','h3','bullet','number','todo','toggle','quote','callout']); if(!allowed.has(type)) return;
    block.type=type;
    if(type==='todo' && typeof block.checked!=='boolean') block.checked=false; else if(type!=='todo') delete block.checked;
    if(type==='toggle' && typeof block.open!=='boolean') block.open=false; else if(type!=='toggle') delete block.open;
    if(isListBlock(block)) setListIndentLevel(block,listIndentLevel(block)); else delete block.indent;
    closeTextFormatPopovers(); commitInlineFormatting(selection);
  }

  function selectionLinkTarget(selection=inlineSelectionState){
    const block=findBlock(selection?.blockId); if(!selection||!block) return null;
    return activeSelectionLink(block,selection.start,selection.end)||null;
  }

  function selectionLinkUrl(selection=inlineSelectionState){ return selectionLinkTarget(selection)?.url||''; }

  function renderInlineLinkResults(query=''){
    const toolbar=els.textFormatToolbar, results=toolbar?.querySelector('[data-format-link-results]'), apply=toolbar?.querySelector('[data-format-link-apply]');
    if(!results) return;
    const q=String(query||'').trim(), key=q.toLocaleLowerCase();
    const pages=state.pages.filter(page=>!key || String(page.title||'Untitled').toLocaleLowerCase().includes(key)).slice(0,8);
    const external=normalizePastedLinkUrl(q);
    let html='';
    if(pages.length){
      html+=`<div class="format-link-section-title">Pages</div>`;
      html+=pages.map(page=>`<button type="button" class="format-link-result" data-format-link-page="${page.id}"><span class="format-link-result-icon">${pageIconMarkup(page.icon)}</span><span class="format-link-result-copy"><b>${escapeHtml(page.title||'Untitled')}</b><small>Link to page</small></span></button>`).join('');
    }
    if(external){
      html+=`<div class="format-link-section-title">External link</div><button type="button" class="format-link-result" data-format-link-external="${escapeHtml(external)}"><span class="format-link-result-icon">↗</span><span class="format-link-result-copy"><b>${escapeHtml(q)}</b><small>${escapeHtml(external)}</small></span></button>`;
    }
    if(!html) html=`<div class="format-link-empty">Type a page name or paste an external URL.</div>`;
    results.innerHTML=html;
    if(apply){ apply.disabled=!external; apply.title=external?'Link selected text to this URL':'Enter an external URL or choose a page'; }
  }

  function openInlineLinkPopover(){
    const toolbar=els.textFormatToolbar, selection=inlineSelectionState; if(!toolbar||!selection) return;
    closeTextFormatPopovers('link');
    const pop=toolbar.querySelector('[data-format-link-popover]'), input=toolbar.querySelector('[data-format-link-input]'), remove=toolbar.querySelector('[data-format-link-remove]');
    pop?.classList.remove('hidden');
    const existing=selectionLinkTarget(selection);
    if(input){
      if(existing?.pageId) input.value=pageById(existing.pageId)?.title||'';
      else input.value=existing?.url||'';
    }
    remove?.classList.toggle('hidden',!existing);
    renderInlineLinkResults(input?.value||'');
    requestAnimationFrame(()=>{ input?.focus({preventScroll:true}); input?.select(); positionTextFormatToolbar(selection.rect); });
  }

  function applyInlineSelectionLink(){
    const selection=inlineSelectionState, block=findBlock(selection?.blockId), input=els.textFormatToolbar?.querySelector('[data-format-link-input]'); if(!selection||!block||!input) return;
    const url=normalizePastedLinkUrl(input.value.trim()) || normalizeHyperlinkUrl(input.value.trim());
    if(!url){ toast('Choose a page or enter a valid URL'); input.focus(); return; }
    applyInlineLinkToSelection(block,selection.start,selection.end,{url}); closeTextFormatPopovers(); commitInlineFormatting(selection);
  }

  function applyInlineSelectionPageLink(pageId){
    const selection=inlineSelectionState, block=findBlock(selection?.blockId), page=pageById(pageId); if(!selection||!block||!page) return;
    applyInlineLinkToSelection(block,selection.start,selection.end,{pageId:page.id}); closeTextFormatPopovers(); commitInlineFormatting(selection);
  }

  function removeInlineSelectionLink(){
    const selection=inlineSelectionState, block=findBlock(selection?.blockId); if(!selection||!block) return;
    const kept=[];
    for(const link of inlineLinksForBlock(block)){
      if(link.end<=selection.start || link.start>=selection.end) kept.push({...link});
      else { if(link.start<selection.start) kept.push({...link,end:selection.start}); if(link.end>selection.end) kept.push({...link,start:selection.end}); }
    }
    block.inlineLinks=normalizeInlineLinkRanges(kept,String(block.text||'').length); if(!block.inlineLinks.length) delete block.inlineLinks;
    closeTextFormatPopovers(); commitInlineFormatting(selection);
  }

  function clearInlineSelectionFormatting(){
    const selection=inlineSelectionState, block=findBlock(selection?.blockId); if(!selection||!block) return;
    clearInlineFormattingRange(block,selection.start,selection.end,{links:true}); closeTextFormatPopovers(); commitInlineFormatting(selection);
  }

  function commentInlineSelection(){
    const selection=inlineSelectionState, block=findBlock(selection?.blockId); if(!selection||!block) return;
    const quoted=String(block.text||'').slice(selection.start,selection.end).trim();
    hideTextFormatToolbar({clear:false}); openComments();
    requestAnimationFrame(()=>{ const input=els.pageComments?.querySelector('[data-comment-input]'); if(input){ input.value=quoted?`“${quoted}” — `:''; input.focus(); input.setSelectionRange(input.value.length,input.value.length); } });
  }

  function bindEvents(){
    if(eventsBound) return;
    eventsBound=true;
    document.addEventListener('click', onClick);
    document.addEventListener('auxclick', onAuxClick);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('pointerdown', onInlineSelectionPointerDown, true);
    document.addEventListener('pointerup', onInlineSelectionPointerEnd, true);
    document.addEventListener('pointercancel', onInlineSelectionPointerEnd, true);
    document.addEventListener('keydown', onInlineSelectionKeyDown, true);
    document.addEventListener('keyup', onInlineSelectionKeyUp, true);
    document.addEventListener('pointerdown', onPaneResizeStart);
    document.addEventListener('pointermove', onSimpleTableHandlePointerMove, true);
    document.addEventListener('input', onInput);
    document.addEventListener('input', e=>{ if(e.target.closest?.('[data-dock-page]')) refreshOtherDockPages(state.currentPageId); });
    document.addEventListener('focusin', e=>{ const pane=e.target.closest?.('.dock-pane[data-editor-group]'); if(pane) focusEditorGroup(pane.dataset.editorGroup); });
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
    document.addEventListener('selectionchange', scheduleTextFormatToolbarFromSelection);
    document.addEventListener('wheel', onGraphWheel, {passive:false});
    document.addEventListener('dragend', clearDragState);
    window.addEventListener('blur', onInlineSelectionInteractionBlur);
    document.addEventListener('scroll', e=>{ if(e.target?.matches?.('[data-code-editor]')) syncCodeScroll(e.target); if(e.target?.matches?.('.simple-table-scroll')) syncSimpleTableHandles(e.target.closest('.simple-table-block')); if(multiBlockSelection?.active) renderMultiBlockSelection(); }, true);
    window.addEventListener('resize', ()=>{ hideFloatingMenus(); hideTextFormatToolbar(); updateSidebarOverflow(); syncAllSimpleTableHandles(); if(multiBlockSelection?.active) renderMultiBlockSelection(); if(activeImageCropBlockId) scheduleImageCropDialogLayout(activeImageCropBlockId); });
  }

  function onGraphWheel(e){
    if(state.mainView!=='graph' || !e.target.closest?.('[data-graph-svg]')) return;
    e.preventDefault();
    setGraphZoom(graphViewRuntime.scale*(e.deltaY>0?.9:1.1));
  }

  function onPaneResizeStart(e){
    const dockDivider=e.target.closest?.('[data-dock-divider]');
    if(dockDivider && e.button===0){
      e.preventDefault();
      const splitElement=dockDivider.closest('[data-dock-split]'), path=[];
      let node=state.editorLayout, current=splitElement;
      while(current?.parentElement?.closest('[data-dock-split]')){
        const parent=current.parentElement.closest('[data-dock-split]');
        path.unshift(parent.firstElementChild.contains(current)?'first':'second'); current=parent;
      }
      for(const branch of path) node=node[branch];
      const move=event=>{
        const rect=splitElement.getBoundingClientRect();
        node.ratio=Math.max(.2,Math.min(.8,node.direction==='row'?(event.clientX-rect.left)/rect.width:(event.clientY-rect.top)/rect.height));
        splitElement.style.setProperty('--first-size',`${Math.round(node.ratio*100)}%`);
      };
      const stop=()=>{ window.removeEventListener('pointermove',move); scheduleSave(); };
      window.addEventListener('pointermove',move); window.addEventListener('pointerup',stop,{once:true}); return;
    }
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
    const settingsTab=e.target.closest?.('[data-settings-tab]');
    if(settingsTab){ setSettingsView(settingsTab.dataset.settingsTab); return; }
    const shortcutBinding=e.target.closest?.('[data-shortcut-action]');
    if(shortcutBinding){ shortcutCaptureAction=shortcutBinding.dataset.shortcutAction; renderShortcutSettings(); return; }
    if(e.target.closest?.('[data-shortcuts-reset]')){ resetShortcuts(); return; }
    if(e.target.closest('#textFormatToolbar')){
      const typeToggle=e.target.closest('[data-format-type-toggle]');
      if(typeToggle){ const menu=els.textFormatToolbar.querySelector('[data-format-type-menu]'); const opening=menu.classList.contains('hidden'); closeTextFormatPopovers(opening?'type':''); menu.classList.toggle('hidden',!opening); return; }
      const blockType=e.target.closest('[data-format-block-type]'); if(blockType){ transformInlineSelectionBlock(blockType.dataset.formatBlockType); return; }
      const colorToggle=e.target.closest('[data-format-color-toggle]');
      if(colorToggle){ const menu=els.textFormatToolbar.querySelector('[data-format-color-menu]'); const opening=menu.classList.contains('hidden'); closeTextFormatPopovers(opening?'color':''); menu.classList.toggle('hidden',!opening); return; }
      const colorChoice=e.target.closest('[data-format-color]'); if(colorChoice){ applyInlineToolbarChoice('color',colorChoice.dataset.formatColor); return; }
      const backgroundChoice=e.target.closest('[data-format-background]'); if(backgroundChoice){ applyInlineToolbarChoice('background',backgroundChoice.dataset.formatBackground); return; }
      const format=e.target.closest('[data-format-inline]'); if(format){ applyInlineToolbarFormat(format.dataset.formatInline); return; }
      if(e.target.closest('[data-format-link-toggle]')){ openInlineLinkPopover(); return; }
      const formatLinkPage=e.target.closest('[data-format-link-page]'); if(formatLinkPage){ applyInlineSelectionPageLink(formatLinkPage.dataset.formatLinkPage); return; }
      const formatLinkExternal=e.target.closest('[data-format-link-external]'); if(formatLinkExternal){ const input=els.textFormatToolbar.querySelector('[data-format-link-input]'); if(input) input.value=formatLinkExternal.dataset.formatLinkExternal; applyInlineSelectionLink(); return; }
      if(e.target.closest('[data-format-link-apply]')){ applyInlineSelectionLink(); return; }
      if(e.target.closest('[data-format-link-remove]')){ removeInlineSelectionLink(); return; }
      if(e.target.closest('[data-format-comment]')){ commentInlineSelection(); return; }
      const moreToggle=e.target.closest('[data-format-more-toggle]');
      if(moreToggle){ const menu=els.textFormatToolbar.querySelector('[data-format-more-menu]'); const opening=menu.classList.contains('hidden'); closeTextFormatPopovers(opening?'more':''); menu.classList.toggle('hidden',!opening); return; }
      if(e.target.closest('[data-format-clear]')){ clearInlineSelectionFormatting(); return; }
      return;
    }
    const ribbon=e.target.closest('[data-ribbon-action]');
    if(ribbon){
      const action=ribbon.dataset.ribbonAction;
      if(action==='toggle-left'){ state.sidebarOpen=!state.sidebarOpen; scheduleSave(); updateWorkspaceChrome(); return; }
      if(action==='files'||action==='favorites'){
        state.leftPanelMode=action; state.sidebarOpen=true; scheduleSave(); renderSidebar(); updateWorkspaceChrome(); return;
      }
      if(action==='search'){ openCommandPalette(); return; }
      if(action==='graph'){ openGraphTab(); return; }
      if(action==='home'){ if(state.currentPageId!=='__home__') cancelPageOperations(); state.mainView='page'; state.currentPageId='__home__'; state.activeTabId=null; scheduleSave(); renderAll(); return; }
      if(action==='new'){ createPage(); return; }
      if(action==='settings'){ openSettings(); return; }
    }
    const rightMode=e.target.closest('[data-right-mode]');
    if(rightMode){ state.rightPanelMode=rightMode.dataset.rightMode; scheduleSave(); renderRightSidebar(); return; }
    const outline=e.target.closest('[data-outline-block]');
    if(outline){ document.querySelector(`.block-row[data-block-id="${outline.dataset.outlineBlock}"]`)?.scrollIntoView({behavior:'smooth',block:'center'}); return; }
    const backlink=e.target.closest('[data-backlink-page]');
    if(backlink){ openPage(backlink.dataset.backlinkPage); return; }
    const graphNode=e.target.closest('[data-graph-page]');
    if(graphNode){ openPage(graphNode.dataset.graphPage,{newTab:true}); return; }
    if(e.target.closest('[data-graph-fit]')){ setGraphZoom(1); return; }
    if(e.target.closest('[data-graph-zoom-in]')){ setGraphZoom(graphViewRuntime.scale*1.2); return; }
    if(e.target.closest('[data-graph-zoom-out]')){ setGraphZoom(graphViewRuntime.scale/1.2); return; }
    const wikiLink=e.target.closest('[data-wiki-page-title]');
    if(wikiLink && (e.ctrlKey||e.metaKey)){ e.preventDefault(); e.stopPropagation(); openWikiLink(wikiLink.dataset.wikiPage,wikiLink.dataset.wikiPageTitle,{newTab:e.shiftKey}); return; }
    const tabClose = e.target.closest('[data-tab-close]');
    if (tabClose){ e.stopPropagation(); closeTab(tabClose.dataset.tabClose); return; }
    const tab = e.target.closest('.editor-tab[data-tab-id], .dock-tab[data-tab-id]');
    if (tab){ activateTab(tab.dataset.tabId); return; }
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
    if(e.target.closest('[data-action="home"]')){ if(state.currentPageId!=='__home__') cancelPageOperations(); state.mainView='page'; state.currentPageId='__home__'; state.activeTabId=null; scheduleSave(); renderAll(); return; }
    if(e.target.closest('[data-action="search"]')){ openCommandPalette(); return; }
    if(e.target.closest('#sidebarToggle')){ state.sidebarOpen=false; scheduleSave(); updateWorkspaceChrome(); return; }
    if(e.target.closest('#sidebarOpen')){ state.sidebarOpen=true; scheduleSave(); updateWorkspaceChrome(); return; }
    if(e.target.closest('#rightSidebarToggle')){ state.rightSidebarOpen=!state.rightSidebarOpen; scheduleSave(); updateWorkspaceChrome(); return; }
    if(e.target.closest('#pageIcon,[data-dock-icon]')){ showIconMenu(e.target.closest('#pageIcon,[data-dock-icon]')); return; }
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
    const pageLinkOpen=e.target.closest('[data-page-link-open]');
    if(pageLinkOpen){ openPage(pageLinkOpen.dataset.pageLinkOpen); return; }
    const pageLinkChoose=e.target.closest('[data-page-link-choose]');
    if(pageLinkChoose){ const row=pageLinkChoose.closest('.page-link-block'); if(row) showPageLinkPicker(row,row.dataset.blockId); return; }
    const pageLinkPick=e.target.closest('[data-page-link-pick]');
    if(pageLinkPick && activePageLinkBlockId){ setPageLinkTarget(activePageLinkBlockId,pageLinkPick.dataset.pageLinkPick); return; }

    const inlinePageLink=e.target.closest('[data-inline-page]');
    if(inlinePageLink && (e.ctrlKey||e.metaKey)){ e.preventDefault(); e.stopPropagation(); const page=pageById(inlinePageLink.dataset.inlinePage); if(page) openPage(page.id,{newTab:e.shiftKey}); else toast('Linked page no longer exists'); return; }
    const inlineLink=e.target.closest('a[data-inline-link]');
    if(inlineLink && (e.ctrlKey||e.metaKey)){ e.preventDefault(); window.open(inlineLink.href,'_blank','noopener,noreferrer'); return; }

    const blockRow=e.target.closest('.block-row');
    if(blockRow){
      const id=blockRow.dataset.blockId;
      if(e.target.closest('[data-code-copy]')){ copyCodeBlock(id); return; }
      if(e.target.closest('[data-mermaid-preview-toggle]')){ const b=findBlock(id); if(b?.language==='mermaid'){ b.mermaidPreview=b.mermaidPreview===false; scheduleSave(); renderBlocks(currentPage()); focusCodeBlock(id); } return; }
      if(e.target.closest('[data-code-wrap]')){ const b=findBlock(id); if(b){ b.codeWrap=!b.codeWrap; scheduleSave(); renderBlocks(currentPage()); focusCodeBlock(id); } return; }
      if(e.target.closest('[data-code-more]')){ showCodeOptions(blockRow,id); return; }
      if(e.target.closest('[data-table-corner-select]')){ selectSimpleTable(id); return; }
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
      if(e.target.closest('[data-image-remove]')){ const b=findBlock(id); if(b){ b.src=''; b.alt=''; delete b.imageWidth; scheduleSave(); renderBlocks(currentPage()); } return; }
      const imageAlignChoice=e.target.closest('[data-image-align-choice]');
      if(imageAlignChoice){ setImageAlignment(id,imageAlignChoice.dataset.imageAlignChoice); return; }
      if(e.target.closest('[data-image-align]')){ const menu=blockRow.querySelector('[data-image-align-menu]'); menu?.classList.toggle('hidden'); return; }
      if(e.target.closest('[data-image-caption-toggle]')){ toggleImageCaption(id); return; }
      if(e.target.closest('[data-image-crop]')){ if(activeImageCropBlockId===id) cancelImageCrop(id); else openImageCrop(id); return; }
      if(e.target.closest('[data-image-crop-aspect-toggle]')){ blockRow.querySelector('[data-image-crop-aspect-menu]')?.classList.toggle('hidden'); return; }
      if(e.target.matches('[data-image-crop-backdrop]')){ cancelImageCrop(id); return; }
      const cropAspect=e.target.closest('[data-image-crop-aspect]');
      if(cropAspect){ setImageCropAspect(id,cropAspect.dataset.imageCropAspect); return; }
      if(e.target.closest('[data-image-crop-reset]')){ resetImageCrop(id); return; }
      if(e.target.closest('[data-image-crop-cancel]')){ cancelImageCrop(id); return; }
      if(e.target.closest('[data-image-crop-apply]')){ applyImageCrop(id); return; }
      if(e.target.closest('[data-image-download]')){ downloadImageBlock(id); return; }
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
    const dockPane=e.target.closest?.('.dock-pane[data-editor-group]');
    if(dockPane) focusEditorGroup(dockPane.dataset.editorGroup);
    const formatToolbar=e.target.closest?.('#textFormatToolbar');
    if(formatToolbar){
      if(!e.target.matches?.('input,textarea')) e.preventDefault();
      return;
    }
    const cropHandle=e.target.closest?.('[data-image-crop-handle]');
    if(e.button===0 && cropHandle){ const row=cropHandle.closest('.image-block'); if(row){ startImageCropFrameResize(cropHandle,row.dataset.blockId,e); return; } }
    const cropFrame=e.target.closest?.('[data-image-crop-frame]');
    if(e.button===0 && cropFrame){ const row=cropFrame.closest('.image-block'); if(row){ startImageCropFrameMove(cropFrame,row.dataset.blockId,e); return; } }
    const imageResize=e.target.closest?.('[data-image-resize]');
    if(e.button===0 && imageResize){
      const row=imageResize.closest('.image-block');
      if(row){ startImageResize(imageResize,row.dataset.blockId,imageResize.dataset.imageResize,e); return; }
    }
    if(e.button===0){
      const tableCell=e.target.closest?.('[data-table-cell]');
      if(tableCell && els.blockEditor?.contains(tableCell)){
        beginTableCellSelection(e,tableCell);
      }else{
        clearTableCellSelection();
        if(selectedTableBlockId && !e.target.closest?.('[data-table-corner-select]')) clearSelectedTable();
        const content=e.target.closest?.('.block-content[contenteditable="true"]');
        if(content && els.blockEditor?.contains(content)) beginMultiBlockSelection(e,content);
        else clearMultiBlockSelection();
      }
    }
    if(e.button!==1) return;
    if(e.target.closest('.editor-tab[data-tab-id], .dock-tab[data-tab-id], .page-tree-row [data-action="open-page"], [data-crumb-id], [data-home-page], [data-page-block-open], [data-page-link-open]')) e.preventDefault();
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
    const links=inlineLinksAroundRange(block,safeStart,safeEnd), formats=inlineFormatsAroundRange(block,safeStart,safeEnd), rightShift=safeStart;
    block.text=original.slice(0,safeStart)+original.slice(safeEnd);
    const merged=[...links.left,...links.right.map(link=>({start:link.start+rightShift,end:link.end+rightShift,url:link.url}))];
    block.inlineLinks=normalizeInlineLinkRanges(merged,block.text.length); if(!block.inlineLinks.length) delete block.inlineLinks;
    const mergedFormats=[...formats.left,...formats.right.map(format=>({...format,start:format.start+rightShift,end:format.end+rightShift}))];
    block.inlineFormats=normalizeInlineFormatRanges(mergedFormats,block.text.length); if(!block.inlineFormats.length) delete block.inlineFormats;
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
    const inlinePageLink=e.target.closest?.('[data-inline-page]');
    if(inlinePageLink){ const page=pageById(inlinePageLink.dataset.inlinePage); if(page){ e.preventDefault(); openPage(page.id,{newTab:true}); } return; }
    const wikiLink=e.target.closest?.('[data-wiki-page-title]');
    if(wikiLink){ e.preventDefault(); openWikiLink(wikiLink.dataset.wikiPage,wikiLink.dataset.wikiPageTitle,{newTab:true}); return; }
    const tab=e.target.closest('.editor-tab[data-tab-id], .dock-tab[data-tab-id]');
    if(tab){ e.preventDefault(); closeTab(tab.dataset.tabId); return; }
    const pageRow=e.target.closest('.page-tree-row');
    if(pageRow && e.target.closest('[data-action="open-page"]')){ e.preventDefault(); openPage(pageRow.dataset.pageId,{newTab:true}); return; }
    const pageBlockLink=e.target.closest('[data-page-block-open]');
    if(pageBlockLink){ e.preventDefault(); openPage(pageBlockLink.dataset.pageBlockOpen,{newTab:true}); return; }
    const pageLinkOpen=e.target.closest('[data-page-link-open]');
    if(pageLinkOpen){ e.preventDefault(); openPage(pageLinkOpen.dataset.pageLinkOpen,{newTab:true}); return; }
    const crumb=e.target.closest('[data-crumb-id]');
    if(crumb){ e.preventDefault(); openPage(crumb.dataset.crumbId,{newTab:true}); return; }
    const homeCard=e.target.closest('[data-home-page]');
    if(homeCard){ e.preventDefault(); openPage(homeCard.dataset.homePage,{newTab:true}); }
  }

  function onInput(e){
    if(e.target.matches?.('[data-format-link-input]')){ renderInlineLinkResults(e.target.value); return; }
    if(e.target.matches?.('[data-graph-search]')){ applyGraphSearch(e.target.value); return; }
    if(e.target.matches?.('[data-page-link-search]')){ renderPageLinkPickerResults(e.target.value); return; }
    if(e.target===els.pageTitle || e.target.matches?.('[data-dock-title]')){ const p=currentPage(); p.title=e.target.innerText.replace(/\n/g,' ') || ''; scheduleSave('merge'); renderSidebar(); renderBreadcrumbs(p); renderTabs(); renderRightSidebar(); if(els.editorDock&&!els.editorDock.classList.contains('hidden')) els.editorDock.querySelectorAll(`.dock-tab[data-tab-id]`).forEach(tab=>{ const item=state.openTabs.find(t=>t.id===tab.dataset.tabId); if(item?.pageId===p.id) tab.querySelector('.tab-title').textContent=p.title||'Untitled'; }); return; }
    if(e.target===els.commandSearch){ commandIndex=0; renderCommandResults(e.target.value); return; }
    if(e.target===els.slashSearch){ slashIndex=0; renderSlashResults(e.target.value); return; }
    if(e.target.matches('[data-icon-search]')){ renderIconPickerResults(e.target.value); return; }
    if(e.target.matches('[data-code-editor]')){ const row=e.target.closest('.code-block'), b=findBlock(row?.dataset.blockId); if(b){ b.text=e.target.value; scheduleSave('merge'); updateCodePreview(row,b,e.target); } return; }
    if(e.target.matches('[data-link-label]')){ const row=e.target.closest('.hyperlink-block'), b=findBlock(row?.dataset.blockId); if(b){ b.text=e.target.innerText.replace(/\n/g,' '); scheduleSave('merge'); } return; }
    if(e.target.matches('[data-link-url]')){ const row=e.target.closest('.hyperlink-block'), b=findBlock(row?.dataset.blockId); if(b){ b.url=e.target.value; scheduleSave('merge'); updateHyperlinkOpen(row,b); } return; }
    const content=e.target.closest('.block-content');
    if(content){
      const row=content.closest('.block-row'); const b=findBlock(row.dataset.blockId); if(!b) return;
      b.text=content.innerText.replace(/\n$/, ''); b.inlineLinks=inlineLinksFromContent(content,b.text); if(!b.inlineLinks.length) delete b.inlineLinks; b.inlineFormats=inlineFormatsFromContent(content,b.text); if(!b.inlineFormats.length) delete b.inlineFormats; content.dataset.empty=b.text.length?'false':'true'; scheduleSave('merge'); if(['h1','h2','h3'].includes(b.type)) renderRightSidebar();
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
    const imageCropInput=e.target.closest('[data-image-crop-zoom],[data-image-crop-x],[data-image-crop-y]');
    if(imageCropInput){ updateImageCropControl(imageCropInput); return; }
    const imageCaption=e.target.closest('[data-image-caption]');
    if(imageCaption){ const row=imageCaption.closest('.image-block'); const b=findBlock(row.dataset.blockId); if(b){ b.caption=imageCaption.innerText.replace(/\n$/, ''); b.showCaption=true; scheduleSave('merge'); } return; }
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
    if(shortcutCaptureAction){
      if(e.key==='Escape'){ e.preventDefault(); shortcutCaptureAction=null; renderShortcutSettings(); return; }
      if(['Control','Meta','Alt','Shift'].includes(e.key)) return;
      e.preventDefault();
      const action=shortcutCaptureAction;
      if(e.key==='Backspace'||e.key==='Delete'){
        state.shortcuts[action]=''; shortcutCaptureAction=null; scheduleSave(); renderShortcutSettings(); return;
      }
      const shortcut=shortcutFromEvent(e);
      if(!shortcut){ toast('Use Ctrl/Cmd or Alt with another key'); return; }
      if(RESERVED_SHORTCUTS.has(shortcut)||(shortcut==='Mod+K'&&action!=='search')){ toast('That shortcut is reserved by the browser or editor'); return; }
      const conflict=SHORTCUT_ACTIONS.find(item=>item.id!==action&&state.shortcuts[item.id]===shortcut);
      if(conflict){ toast(`Already assigned to ${conflict.label}`); return; }
      state.shortcuts[action]=shortcut; shortcutCaptureAction=null; scheduleSave(); renderShortcutSettings(); return;
    }
    const shortcutAction=shortcutActionForEvent(e);
    const inlineLinkShortcut=shortcutAction==='search'&&shortcutFromEvent(e)==='Mod+K'&&!!e.target.closest?.('.block-content[contenteditable="true"]')&&!!captureInlineSelection();
    if(shortcutAction&&!inlineLinkShortcut&&!e.repeat){ e.preventDefault(); runShortcutAction(shortcutAction); return; }
    const mod=e.ctrlKey||e.metaKey;
    if(mod&&e.key.toLowerCase()==='y'&&state.shortcuts.redo===DEFAULT_SHORTCUTS.redo&&!e.repeat){ e.preventDefault(); runShortcutAction('redo'); return; }
    if(e.target.matches?.('[data-format-link-input]')){
      if(e.key==='Enter'){
        e.preventDefault();
        const q=e.target.value.trim(), external=normalizePastedLinkUrl(q);
        if(external){ applyInlineSelectionLink(); return; }
        const key=q.toLocaleLowerCase(), page=state.pages.find(p=>String(p.title||'Untitled').toLocaleLowerCase()===key) || state.pages.find(p=>String(p.title||'Untitled').toLocaleLowerCase().includes(key));
        if(page){ applyInlineSelectionPageLink(page.id); return; }
        toast('Choose a page or enter a valid URL'); return;
      }
      if(e.key==='Escape'){ e.preventDefault(); closeTextFormatPopovers(); restoreInlineSelection(inlineSelectionState); return; }
    }
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
    if((e.target===els.pageTitle || e.target.matches?.('[data-dock-title]')) && e.key==='Enter'){
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
    if(mod && e.key==='Tab'){ e.preventDefault(); cycleTab(e.shiftKey?-1:1); return; }
    if(mod && e.key.toLowerCase()==='w' && state.activeTabId){ e.preventDefault(); closeTab(state.activeTabId); return; }
    const keyboardInlineSelection=captureInlineSelection();
    if(keyboardInlineSelection && mod){
      inlineSelectionState=keyboardInlineSelection;
      const key=e.key.toLowerCase();
      if(!e.shiftKey && key==='b'){ e.preventDefault(); applyInlineToolbarFormat('bold'); return; }
      if(!e.shiftKey && key==='i'){ e.preventDefault(); applyInlineToolbarFormat('italic'); return; }
      if(!e.shiftKey && key==='u'){ e.preventDefault(); applyInlineToolbarFormat('underline'); return; }
      if(!e.shiftKey && key==='e'){ e.preventDefault(); applyInlineToolbarFormat('code'); return; }
      if(e.shiftKey && key==='s'){ e.preventDefault(); applyInlineToolbarFormat('strike'); return; }
      if(!e.shiftKey && key==='k'){ e.preventDefault(); showTextFormatToolbar(keyboardInlineSelection); openInlineLinkPopover(); return; }
      if(e.shiftKey && key==='m'){ e.preventDefault(); commentInlineSelection(); return; }
    }
    if(e.key==='Escape'){ hideFloatingMenus(); hideTextFormatToolbar(); document.querySelectorAll('.modal-backdrop').forEach(m=>m.classList.add('hidden')); return; }
    const keyboardGraphNode=e.target.closest?.('[data-graph-page]');
    if(keyboardGraphNode && (e.key==='Enter'||e.key===' ')){ e.preventDefault(); openPage(keyboardGraphNode.dataset.graphPage,{newTab:true}); return; }

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
      if(items.length) slashIndex=Math.max(0,Math.min(slashIndex,items.length-1)); else slashIndex=0;
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
        else if(/^\d+[.)]$/.test(marker)) shortcutType='number';
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
      if((b.type==='bullet' || b.type==='number' || b.type==='todo' || b.type==='toggle') && !(b.text||'').trim()){
        b.type='text';
        b.text='';
        delete b.checked;
        delete b.open;
        delete b.indent;
        delete b.inlineLinks;
        hideFloatingMenus();
        scheduleSave();
        renderBlocks(page);
        focusBlock(b.id,0);
        return;
      }
      const sel=window.getSelection(); const caret=getCaretOffset(content);
      const text=b.text||'', linkSplit=splitInlineLinksAt(b,caret), formatSplit=splitInlineFormatsAt(b,caret); const left=text.slice(0,caret), right=text.slice(caret);
      b.text=left; b.inlineLinks=normalizeInlineLinkRanges(linkSplit.left,left.length); if(!b.inlineLinks.length) delete b.inlineLinks; b.inlineFormats=normalizeInlineFormatRanges(formatSplit.left,left.length); if(!b.inlineFormats.length) delete b.inlineFormats;
      const nextType=['bullet','number','todo','toggle'].includes(b.type) ? b.type : 'text';
      const nb={id:uid('b'),type:nextType,text:right}; if(isListBlock(nb)) setListIndentLevel(nb,listIndentLevel(b)); const nextLinks=normalizeInlineLinkRanges(linkSplit.right,right.length); if(nextLinks.length) nb.inlineLinks=nextLinks; const nextFormats=normalizeInlineFormatRanges(formatSplit.right,right.length); if(nextFormats.length) nb.inlineFormats=nextFormats; if(nextType==='todo') nb.checked=false;
      blocks.splice(index+1,0,nb); scheduleSave(); renderBlocks(page); focusBlock(nb.id,0); return;
    }
    if(e.key==='Backspace' && (b.text||'')==='' && index===0 && blocks===page.blocks){
      e.preventDefault();
      blocks.splice(index,1);
      scheduleSave();
      renderBlocks(page);
      requestAnimationFrame(()=>{
        els.pageTitle.focus();
        setCaretOffset(els.pageTitle,(page.title||'').length);
      });
      return;
    }
    if(e.key==='Backspace' && (b.text||'')==='' && index>0){
      e.preventDefault();
      const prev=blocks[index-1];
      blocks.splice(index,1);
      scheduleSave();
      renderBlocks(page);
      if(isTextLikeBlock(prev)) focusBlock(prev.id,(prev.text||'').length);
      return;
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
    if(e.key==='Backspace' && getCaretOffset(content)===0 && index>0){
      const prev=blocks[index-1];
      if(isTextLikeBlock(prev)){
        e.preventDefault(); const pos=(prev.text||'').length, mergedLinks=[...inlineLinksForBlock(prev),...inlineLinksForBlock(b).map(link=>({start:link.start+pos,end:link.end+pos,url:link.url}))], mergedFormats=[...inlineFormatsForBlock(prev),...inlineFormatsForBlock(b).map(format=>({...format,start:format.start+pos,end:format.end+pos}))]; prev.text=(prev.text||'')+(b.text||''); prev.inlineLinks=normalizeInlineLinkRanges(mergedLinks,prev.text.length); if(!prev.inlineLinks.length) delete prev.inlineLinks; prev.inlineFormats=normalizeInlineFormatRanges(mergedFormats,prev.text.length); if(!prev.inlineFormats.length) delete prev.inlineFormats; blocks.splice(index,1); scheduleSave(); renderBlocks(page); focusBlock(prev.id,pos);
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
        if(axis==='row') tableBlock.querySelector(`tr[data-table-row="${index}"]`)?.classList.add('table-row-dragging');
        else markTableColumnDragState(tableBlock,index,'table-col-dragging');
        if(e.dataTransfer){
          e.dataTransfer.effectAllowed='move';
          e.dataTransfer.setData('text/plain',`table-${axis}:${blockId}:${index}`);
        }
        return;
      }
    }
    const tab=e.target.closest('.editor-tab[data-tab-id], .dock-tab[data-tab-id]');
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
      const pane=e.target.closest?.('.dock-pane[data-editor-group]') || e.target.closest?.('#editorView:not(.hidden)');
      if(pane){
        e.preventDefault(); if(e.dataTransfer) e.dataTransfer.dropEffect='move';
        const target=dockTargetAt(e,pane);
        clearDockIndicators(); dockDrop={...target,groupId:pane.dataset.editorGroup||editorGroups(state.editorLayout)[0].id};
        pane.classList.add(`dock-drop-${target.edge||'center'}`);
        return;
      }
      clearDockIndicators();
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
      const pane=e.target.closest?.('.dock-pane[data-editor-group]') || e.target.closest?.('#editorView:not(.hidden)');
      if(pane){
        e.preventDefault();
        const target=dockTargetAt(e,pane), groupId=pane.dataset.editorGroup||editorGroups(state.editorLayout)[0].id;
        if(target.edge) splitTab(dragTabId,groupId,target.edge);
        else moveTabToGroup(dragTabId,groupId,target.beforeTabId);
        clearDragState(); return;
      }
      const strip=e.target.closest('.tabs-scroll'); if(!strip) return clearDragState(); e.preventDefault();
      const tabs=state.openTabs||[], from=tabs.findIndex(t=>t.id===dragTabId); if(from<0) return clearDragState();
      const target=e.target.closest('.editor-tab[data-tab-id]');
      let to=tabs.length;
      if(target){ const targetIndex=tabs.findIndex(t=>t.id===target.dataset.tabId); const r=target.getBoundingClientRect(); to=targetIndex+(e.clientX>=r.left+r.width/2?1:0); }
      const [moved]=tabs.splice(from,1); if(from<to) to--; tabs.splice(Math.max(0,Math.min(to,tabs.length)),0,moved);
      scheduleSave(); renderAll(); clearDragState(); return;
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
      const rows=[...tableBlock.querySelectorAll('tr[data-table-row]')];
      if(!rows.length) return null;
      let best=null, bestDistance=Infinity;
      for(const row of rows){
        const rect=row.getBoundingClientRect();
        const center=rect.top+rect.height/2;
        const distance=Math.abs(e.clientY-center);
        if(distance<bestDistance){ bestDistance=distance; best={index:Number(row.dataset.tableRow),rect}; }
      }
      if(!best||!Number.isInteger(best.index)) return null;
      return {index:best.index,after:e.clientY>=best.rect.top+best.rect.height/2};
    }
    const firstRow=tableBlock.querySelector('tr[data-table-row="0"]');
    const cells=firstRow?[...firstRow.querySelectorAll('[data-table-column]')]:[];
    if(!cells.length) return null;
    let best=null, bestDistance=Infinity;
    for(const cell of cells){
      const rect=cell.getBoundingClientRect();
      const center=rect.left+rect.width/2;
      const distance=Math.abs(e.clientX-center);
      if(distance<bestDistance){ bestDistance=distance; best={index:Number(cell.dataset.tableColumn),rect}; }
    }
    if(!best||!Number.isInteger(best.index)) return null;
    return {index:best.index,after:e.clientX>=best.rect.left+best.rect.width/2};
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

  function dockTargetAt(e,pane){
    const tab=e.target.closest?.('.dock-tab[data-tab-id]');
    if(e.target.closest?.('.dock-tabs') && pane.contains(e.target)){
      const rect=tab?.getBoundingClientRect();
      return {edge:null,beforeTabId:tab && e.clientX<rect.left+rect.width/2?tab.dataset.tabId:tab?.nextElementSibling?.dataset.tabId||null};
    }
    const rect=pane.getBoundingClientRect();
    const x=(e.clientX-rect.left)/rect.width, y=(e.clientY-rect.top)/rect.height;
    const distances=[['left',x],['right',1-x],['top',y],['bottom',1-y]].sort((a,b)=>a[1]-b[1]);
    const draggedTab=state.openTabs.find(tab=>tab.id===dragTabId);
    return {edge:draggedTab?.kind==='page' && distances[0][1]<.23?distances[0][0]:null,beforeTabId:null};
  }
  function clearDockIndicators(){
    document.querySelectorAll('.dock-drop-left,.dock-drop-right,.dock-drop-top,.dock-drop-bottom,.dock-drop-center').forEach(node=>node.classList.remove('dock-drop-left','dock-drop-right','dock-drop-top','dock-drop-bottom','dock-drop-center'));
    dockDrop=null;
  }
  function clearDragState(){
    dragBlockId=null; dragTabId=null; tableAxisDrag=null;
    clearDockIndicators();
    clearTableAxisDropIndicators();
    document.querySelectorAll('.dragging,.drop-before,.drop-after,.column-drop-target,.tab-drop-before,.tab-drop-after').forEach(x=>x.classList.remove('dragging','drop-before','drop-after','column-drop-target','tab-drop-before','tab-drop-after'));
  }

  function createSubpageForBlock(parentId){
    const page={id:uid('page'),parentId,title:'Untitled',icon:'📄',favorite:false,expanded:true,blocks:[newTextBlock()]};
    state.pages.push(page);
    const parent=pageById(parentId); if(parent) parent.expanded=true;
    return page;
  }

  function createPage(parentId=null,groupId=state.activeEditorGroupId){
    state.mainView='page';
    const page={id:uid('page'),parentId,title:'Untitled',icon:'📄',favorite:false,expanded:true,blocks:[newTextBlock()]};
    state.pages.push(page); if(parentId){ const parent=pageById(parentId); if(parent) parent.expanded=true; }
    createTab(page.id,true,groupId); scheduleSave(); renderAll(); setTimeout(()=>{ els.pageTitle?.focus(); if(els.pageTitle) selectAllContent(els.pageTitle); },0);
  }

  function deletePage(id){
    const ids=new Set([id]); let changed=true; while(changed){ changed=false; for(const p of state.pages){ if(p.parentId&&ids.has(p.parentId)&&!ids.has(p.id)){ids.add(p.id); changed=true;} } }
    if(ids.has(state.currentPageId)) cancelPageOperations();
    state.pages=state.pages.filter(p=>!ids.has(p.id));
    state.openTabs=(state.openTabs||[]).filter(tab=>tab.kind==='graph' || !ids.has(tab.pageId));
    repairEditorGroups();
    if(!(state.openTabs||[]).some(tab=>tab.id===state.activeTabId)) state.activeTabId=null;
    if(ids.has(state.currentPageId)){
      const next=state.openTabs.at(-1)||null;
      if(next?.kind==='graph'){
        state.activeTabId=next.id; state.mainView='graph'; state.currentPageId=state.pages[0]?.id||'__home__';
      }else{
        state.activeTabId=next?.id||null; state.currentPageId=next?.pageId||state.pages[0]?.id||'__home__'; state.mainView='page';
      }
    }
    scheduleSave(); renderAll(); toast('Page moved to trash');
  }

  function duplicatePage(id){
    const p=pageById(id); if(!p)return; const cp=clone(p); cp.id=uid('page'); cp.title=`${p.title} copy`; cp.blocks=cp.blocks.map(cloneBlockWithNewIds); cp.favorite=false; state.pages.push(cp); openPage(cp.id); toast('Page duplicated');
  }

  function openPage(id,{newTab=false}={}){ if(!pageById(id))return; state.mainView='page'; if(newTab)createTab(id,true); else replaceActiveTab(id); scheduleSave(); renderAll(); }

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

  function richHtmlInlinePayload(root,{skipNestedLists=false}={}){
    let value=''; const links=[],formats=[];
    const appendRaw=raw=>{
      let part=String(raw||'').replace(/\u00a0/g,' ').replace(/[\t\r\n ]+/g,' ');
      if(!part) return;
      if(value && /\s$/.test(value) && /^\s/.test(part)) part=part.replace(/^\s+/, '');
      value+=part;
    };
    const inlineFormatForElement=el=>{
      const tag=el.tagName;
      if(tag==='STRONG'||tag==='B') return {type:'bold'};
      if(tag==='EM'||tag==='I') return {type:'italic'};
      if(tag==='U') return {type:'underline'};
      if(tag==='S'||tag==='DEL'||tag==='STRIKE') return {type:'strike'};
      if(tag==='CODE' && el.parentElement?.tagName!=='PRE') return {type:'code'};
      return null;
    };
    const walk=node=>{
      if(node.nodeType===Node.TEXT_NODE){ appendRaw(node.nodeValue); return; }
      if(node.nodeType!==Node.ELEMENT_NODE) return;
      const el=node, tag=el.tagName;
      if(['SCRIPT','STYLE','NOSCRIPT'].includes(tag)) return;
      if(skipNestedLists && (tag==='UL'||tag==='OL')) return;
      if(tag==='BR'){ value+='\n'; return; }
      if(tag==='IMG'){
        const alt=String(el.getAttribute('alt')||'').trim(); if(alt) appendRaw(alt);
        return;
      }
      const format=inlineFormatForElement(el), formatStart=value.length;
      if(tag==='A'){
        const start=value.length;
        for(const child of el.childNodes) walk(child);
        const end=value.length;
        const url=normalizePastedLinkUrl(el.getAttribute('href')||'') || normalizeHyperlinkUrl(el.getAttribute('href')||'');
        if(url && end>start) links.push({start,end,url});
      }else{
        for(const child of el.childNodes) walk(child);
      }
      if(format && value.length>formatStart) formats.push({start:formatStart,end:value.length,...format});
    };
    walk(root);
    const leading=value.length-value.trimStart().length;
    const clean=value.trim();
    const normalizedLinks=normalizeInlineLinkRanges(links.map(link=>({start:Math.max(0,link.start-leading),end:Math.max(0,link.end-leading),url:link.url})),clean.length);
    const normalizedFormats=normalizeInlineFormatRanges(formats.map(format=>({...format,start:Math.max(0,format.start-leading),end:Math.max(0,format.end-leading)})),clean.length);
    return {text:clean,links:normalizedLinks,formats:normalizedFormats};
  }

  function richHtmlBlockFromElement(el,type,extra={}){
    const payload=richHtmlInlinePayload(el);
    if(!payload.text && type!=='text') return null;
    const block={id:uid('b'),type,text:payload.text,...extra};
    if(payload.links.length) block.inlineLinks=payload.links;
    if(payload.formats?.length) block.inlineFormats=payload.formats;
    return block;
  }

  function parseRichHtmlBlocks(html){
    const source=String(html||''); if(!source.trim()) return [];
    let doc;
    try{ doc=new DOMParser().parseFromString(source,'text/html'); }catch{return [];}
    const blocks=[];
    const pushBlock=block=>{ if(block) blocks.push(block); };

    const processList=(list,indent=0)=>{
      const type=list.tagName==='OL'?'number':'bullet';
      for(const li of Array.from(list.children).filter(child=>child.tagName==='LI')){
        const payload=richHtmlInlinePayload(li,{skipNestedLists:true});
        const checkbox=li.querySelector(':scope > input[type="checkbox"], :scope > p > input[type="checkbox"]');
        const block={id:uid('b'),type:checkbox?'todo':type,text:payload.text};
        if(indent) block.indent=Math.min(8,indent);
        if(checkbox) block.checked=checkbox.checked || checkbox.hasAttribute('checked');
        if(payload.links.length) block.inlineLinks=payload.links;
        if(payload.formats?.length) block.inlineFormats=payload.formats;
        if(block.text || checkbox) blocks.push(block);
        for(const nested of Array.from(li.children).filter(child=>child.tagName==='UL'||child.tagName==='OL')) processList(nested,indent+1);
      }
    };

    const processTable=table=>{
      const rowEls=[...table.querySelectorAll('tr')]; if(!rowEls.length) return;
      const rows=rowEls.map(row=>[...row.children].filter(cell=>cell.tagName==='TH'||cell.tagName==='TD').map(cell=>(cell.innerText||cell.textContent||'').trim()));
      const width=Math.max(1,...rows.map(row=>row.length));
      const normalized=rows.map(row=>{ const next=row.slice(0,width); while(next.length<width) next.push(''); return next; });
      blocks.push({id:uid('b'),type:'table',tableRows:normalized,tableHeaderRow:!!table.querySelector('th'),tableHeaderColumn:false});
    };

    const processContainer=container=>{
      for(const node of container.childNodes){
        if(node.nodeType===Node.TEXT_NODE){
          const value=String(node.nodeValue||'').trim(); if(value) blocks.push({id:uid('b'),type:'text',text:value});
          continue;
        }
        if(node.nodeType!==Node.ELEMENT_NODE) continue;
        const el=node, tag=el.tagName;
        if(['SCRIPT','STYLE','NOSCRIPT'].includes(tag)) continue;
        if(/^H[1-6]$/.test(tag)){ pushBlock(richHtmlBlockFromElement(el,`h${Math.min(3,Number(tag.slice(1)))}`)); continue; }
        if(tag==='P'){ pushBlock(richHtmlBlockFromElement(el,'text')); continue; }
        if(tag==='UL'||tag==='OL'){ processList(el,0); continue; }
        if(tag==='BLOCKQUOTE'){
          const inner=[...el.children].filter(child=>['P','DIV'].includes(child.tagName));
          if(inner.length){ for(const child of inner) pushBlock(richHtmlBlockFromElement(child,'quote')); }
          else pushBlock(richHtmlBlockFromElement(el,'quote'));
          continue;
        }
        if(tag==='PRE'){
          const code=el.querySelector('code')||el;
          const className=String(code.className||'');
          const langMatch=className.match(/(?:language|lang)-([a-z0-9_+#.-]+)/i);
          const language=normalizeMarkdownCodeLanguage(langMatch?.[1]||'plain');
          blocks.push({id:uid('b'),type:'code',text:String(code.textContent||'').replace(/\n$/,''),language,codeWrap:false,codeLineNumbers:false,mermaidPreview:language==='mermaid'});
          continue;
        }
        if(tag==='TABLE'){ processTable(el); continue; }
        if(tag==='HR'){ blocks.push({id:uid('b'),type:'divider'}); continue; }
        if(tag==='IMG'){
          const src=normalizeImageUrl(el.getAttribute('src')||'');
          if(src) blocks.push({id:uid('b'),type:'image',src,caption:'',alt:String(el.getAttribute('alt')||'')});
          continue;
        }
        if(tag==='A' && !el.querySelector('*')){
          const payload=richHtmlInlinePayload(el), url=normalizePastedLinkUrl(el.getAttribute('href')||'') || normalizeHyperlinkUrl(el.getAttribute('href')||'');
          if(url && payload.text){ blocks.push({id:uid('b'),type:'link',text:payload.text,url}); continue; }
        }
        const structural=el.querySelector('h1,h2,h3,h4,h5,h6,p,ul,ol,blockquote,pre,table,hr,img');
        if(structural){ processContainer(el); continue; }
        pushBlock(richHtmlBlockFromElement(el,'text'));
      }
    };

    processContainer(doc.body);
    return blocks;
  }

  function richHtmlShouldCreateBlocks(html,blocks){
    if(!html || !blocks?.length) return false;
    let doc; try{ doc=new DOMParser().parseFromString(html,'text/html'); }catch{return false;}
    if(doc.body.querySelector('h1,h2,h3,h4,h5,h6,ul,ol,blockquote,pre,table,hr')) return true;
    return doc.body.querySelectorAll('p').length>1 || blocks.length>1;
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

  function pasteParsedBlocksIntoBlock(content,parsed,sourceLabel='Content'){
    const row=content?.closest('.block-row'), location=findBlockLocation(row?.dataset.blockId), page=currentPage();
    if(!location || !page || !isTextLikeBlock(location.block) || !parsed?.length) return false;

    const block=location.block, original=String(block.text||''), {start,end}=selectionOffsetsWithin(content);
    const left=original.slice(0,start), right=original.slice(end), splitLinks=inlineLinksAroundRange(block,start,end), splitFormats=inlineFormatsAroundRange(block,start,end);
    const replacement=[];
    if(left){ block.text=left; block.inlineLinks=normalizeInlineLinkRanges(splitLinks.left,left.length); if(!block.inlineLinks.length) delete block.inlineLinks; block.inlineFormats=normalizeInlineFormatRanges(splitFormats.left,left.length); if(!block.inlineFormats.length) delete block.inlineFormats; replacement.push(block); }
    replacement.push(...parsed);
    let trailing=null;
    if(right){
      const trailingType=['bullet','number','todo','toggle'].includes(block.type)?block.type:'text';
      trailing={id:uid('b'),type:trailingType,text:right};
      const trailingLinks=normalizeInlineLinkRanges(splitLinks.right,right.length); if(trailingLinks.length) trailing.inlineLinks=trailingLinks;
      const trailingFormats=normalizeInlineFormatRanges(splitFormats.right,right.length); if(trailingFormats.length) trailing.inlineFormats=trailingFormats;
      if(trailingType==='todo') trailing.checked=false;
      replacement.push(trailing);
    }
    location.blocks.splice(location.index,1,...replacement);
    ensureBlockList(location.blocks);
    scheduleSave(); hideFloatingMenus(); renderBlocks(page);

    const focusTarget=trailing || [...parsed].reverse().find(isTextLikeBlock) || (left?block:null);
    if(focusTarget) focusBlock(focusTarget.id,(focusTarget.text||'').length);
    toast(`${sourceLabel} pasted as ${parsed.length} block${parsed.length===1?'':'s'}`);
    return true;
  }

  function pasteMarkdownIntoBlock(content,markdown,sourceLabel='Markdown'){
    return pasteParsedBlocksIntoBlock(content,parseMarkdownBlocks(markdown),sourceLabel);
  }

  function pasteRichHtmlIntoBlock(content,html){
    const parsed=parseRichHtmlBlocks(html);
    if(!richHtmlShouldCreateBlocks(html,parsed)) return false;
    return pasteParsedBlocksIntoBlock(content,parsed,'Rich text');
  }

  function onBeforeInput(e){
    if((e.target===els.pageTitle || e.target.matches?.('[data-dock-title]')) && ['insertParagraph','insertLineBreak'].includes(e.inputType)) e.preventDefault();
  }

  function onPaste(e){
    if(externalIconPaneActive()){
      const file=transferImageFile(e.clipboardData);
      const targetIsTextField=e.target.matches?.('input,textarea,[contenteditable="true"]');
      if(file){ e.preventDefault(); loadPageIconFile(file); return; }
      if(!targetIsTextField && applyExternalIconTransfer(e.clipboardData)){ e.preventDefault(); return; }
    }
    if(e.target===els.pageTitle || e.target.matches?.('[data-dock-title]')){
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
      const richHtml=String(e.clipboardData?.getData('text/html')||'');
      if(richHtml && pasteRichHtmlIntoBlock(content,richHtml)){
        e.preventDefault();
        return;
      }
      const explicitMarkdown=String(e.clipboardData?.getData('text/markdown')||'');
      const plainText=String(e.clipboardData?.getData('text/plain')||'');
      const markdown=explicitMarkdown || plainText;
      const markdownLike=!!explicitMarkdown || looksLikeMarkdown(markdown);
      const hasParagraphBreaks=!explicitMarkdown && /(?:\r?\n)[ \t]*(?:\r?\n)/.test(plainText);
      if(markdown && (markdownLike || hasParagraphBreaks) && pasteMarkdownIntoBlock(content,markdown,markdownLike?'Markdown':'Text')){
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
    const items=BLOCK_TYPES.filter(x=>blockTypeMatchesQuery(x,query)).sort((a,b)=>blockTypeSearchRank(a,query)-blockTypeSearchRank(b,query));
    slashIndex=0;
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
    if(type==='page-link'){
      b.pageId=''; delete b.text;
      scheduleSave(); hideSlashMenu(); renderBlocks(parent);
      requestAnimationFrame(()=>{ const row=document.querySelector(`.block-row[data-block-id="${b.id}"]`); if(row) showPageLinkPicker(row,b.id); });
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
      {cmd:'graph-view',icon:'◇',title:'Open graph view',desc:'Visualize links between pages'},
      ...(state.mainView==='page' && currentPage() ? [
        {cmd:'change-page-icon',icon:'☺',title:'Change page icon',desc:'Choose an icon for this page'},
        {cmd:'page-comments',icon:'☵',title:'Page comments',desc:'Open comments for this page'}
      ] : []),
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
    if(cmd==='graph-view') openGraphTab();
    if(cmd==='change-page-icon') showIconMenu(els.pageIcon?.classList.contains('hidden')?els.pageTitle:els.pageIcon);
    if(cmd==='page-comments') openComments();
    if(cmd==='toggle-theme') cycleTheme();
    if(cmd==='settings') openSettings();
    if(cmd==='new-child') createPage(pageId);
    if(cmd==='duplicate-page') duplicatePage(pageId);
    if(cmd==='toggle-favorite'){ const p=pageById(pageId); p.favorite=!p.favorite; scheduleSave(); renderSidebar(); }
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
  function setPageIcon(icon,pageId=state.currentPageId){ const p=pageById(pageId); if(!p || state.currentPageId!==pageId)return; p.icon=icon; scheduleSave(); els.pageMetaMenu.classList.add('hidden'); renderAll(); }
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
  function addPageComment(){ const input=els.pageComments.querySelector('[data-comment-input]'); const text=input?.value.trim(); if(!text)return; const p=currentPage(); if(!p.comments)p.comments=[]; p.comments.push({id:uid('comment'),text,createdAt:new Date().toISOString()}); scheduleSave(); renderPageComments(); requestAnimationFrame(()=>els.pageComments.querySelector('[data-comment-input]')?.focus()); }
  function deletePageComment(id){ const p=currentPage(); p.comments=(p.comments||[]).filter(c=>c.id!==id); scheduleSave(); renderPageComments(); }


  function applyTheme(){
    let dark=false;
    if(state.theme==='dark')dark=true; else if(state.theme==='system')dark=matchMedia('(prefers-color-scheme: dark)').matches;
    document.body.classList.toggle('dark',dark); updateSettingsText();
    mermaidConfiguredTheme=null;
    scheduleMermaidPreviews();
  }
  function cycleTheme(){ const options=['system','light','dark']; state.theme=options[(options.indexOf(state.theme)+1)%options.length]; scheduleSave(); applyTheme(); toast(`Theme: ${state.theme}`); }
  function openSettings(view='general'){
    shortcutCaptureAction=null;
    updateSettingsText(); renderShortcutSettings(); setSettingsView(view);
    els.settingsModal.classList.remove('hidden');
  }
  function setSettingsView(view){
    const selected=['general','shortcuts'].includes(view)?view:'general';
    if(selected!=='shortcuts'&&shortcutCaptureAction){ shortcutCaptureAction=null; renderShortcutSettings(); }
    document.querySelectorAll('[data-settings-tab]').forEach(tab=>{
      const active=tab.dataset.settingsTab===selected;
      tab.classList.toggle('active',active); tab.setAttribute('aria-selected',String(active));
    });
    document.querySelectorAll('[data-settings-view]').forEach(panel=>panel.classList.toggle('hidden',panel.dataset.settingsView!==selected));
  }
  function renderShortcutSettings(){
    if(!els.shortcutList) return;
    els.shortcutList.innerHTML=SHORTCUT_ACTIONS.map(({id,label})=>{
      const recording=shortcutCaptureAction===id;
      const visibleLabel=id==='redo'&&state.shortcuts.redo===DEFAULT_SHORTCUTS.redo?'Redo (Ctrl/Cmd+Y also works)':label;
      return `<div class="shortcut-row"><span class="shortcut-label">${visibleLabel}</span><button type="button" class="shortcut-binding ${recording?'recording':''}" data-shortcut-action="${id}" aria-label="Set shortcut for ${label}">${recording?'Press keys…':formatShortcut(state.shortcuts?.[id])}</button></div>`;
    }).join('');
  }
  function resetShortcuts(){
    shortcutCaptureAction=null; state.shortcuts={...DEFAULT_SHORTCUTS}; scheduleSave(); renderShortcutSettings(); toast('Shortcuts reset to defaults');
  }
  function shortcutActionForEvent(event){
    const shortcut=shortcutFromEvent(event);
    return Object.keys(state.shortcuts||{}).find(action=>shortcut && state.shortcuts[action]===shortcut)||null;
  }
  function runShortcutAction(action){
    if(action==='undo'){ undoWorkspace(); return; }
    if(action==='redo'){ redoWorkspace(); return; }
    if(action==='search'){ openCommandPalette(); return; }
    if(action==='favorite'){
      const page=state.mainView==='page'&&state.currentPageId!=='__home__'?currentPage():null; if(!page)return;
      page.favorite=!page.favorite; scheduleSave(); renderSidebar(); toast(page.favorite?'Added to favorites':'Removed from favorites'); return;
    }
    if(action==='comments'){ if(state.mainView==='page'&&state.currentPageId!=='__home__') openComments(); return; }
    if(action==='share'){ if(state.mainView==='page'&&state.currentPageId!=='__home__') els.shareModal.classList.remove('hidden'); return; }
    if(action==='toggleRightSidebar'){ state.rightSidebarOpen=!state.rightSidebarOpen; scheduleSave(); updateWorkspaceChrome(); return; }
    if(action==='toggleTheme'){ cycleTheme(); return; }
    if(action==='settings'){ openSettings(); return; }
    if(action==='newPage'){ createPage(); return; }
    if(action==='splitRight'){ splitActiveTab('right'); return; }
    if(action==='splitDown'){ splitActiveTab('bottom'); return; }
    if(action==='mergePanes'){ resetEditorLayout(); return; }
    if(action==='graph') openGraphTab();
  }
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
  function hideFloatingMenus(){ els.slashMenu.classList.add('hidden'); hideEmojiMenu(); els.blockMenu.classList.add('hidden'); els.pageMetaMenu?.classList.add('hidden'); activeSlashBlockId=null; activePageLinkBlockId=null; }
  function cancelPageOperations(){
    pageOperationEpoch+=1;
    clearMultiBlockSelection();
    clearSelectedTable();
    hideFloatingMenus();
    hideTextFormatToolbar();
    clearExternalIconDropState();
    activeImageBlockId=null; activeImageLinkBlockId=null; activeImageCropBlockId=null; imageCropSession=null;
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

  void init();
})();
