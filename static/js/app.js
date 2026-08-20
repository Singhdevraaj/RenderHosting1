/**
 * Gemini Tool-Calling Agent - Web UI Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // Global State
  let toolsCatalog = [];
  let totalToolExecutions = 0;
  let customApiKey = localStorage.getItem('gemini_custom_api_key') || '';

  // DOM Element References
  const apiStatusDot = document.getElementById('apiStatusDot');
  const apiStatusText = document.getElementById('apiStatusText');
  const registeredToolsCount = document.getElementById('registeredToolsCount');
  const sidebarToolCount = document.getElementById('sidebarToolCount');
  const totalCallsCount = document.getElementById('totalCallsCount');

  const welcomeHero = document.getElementById('welcomeHero');
  const messagesContainer = document.getElementById('messagesContainer');
  const chatForm = document.getElementById('chatForm');
  const userInput = document.getElementById('userInput');
  const sendBtn = document.getElementById('sendBtn');
  const clearChatBtn = document.getElementById('clearChatBtn');

  const toolsGrid = document.getElementById('toolsGrid');
  const toolSearchInput = document.getElementById('toolSearchInput');

  const playgroundToolSelect = document.getElementById('playgroundToolSelect');
  const playgroundParamsContainer = document.getElementById('playgroundParamsContainer');
  const runPlaygroundBtn = document.getElementById('runPlaygroundBtn');
  const playgroundResultCard = document.getElementById('playgroundResultCard');
  const playgroundResultCode = document.getElementById('playgroundResultCode');
  const playgroundTime = document.getElementById('playgroundTime');

  const addToolForm = document.getElementById('addToolForm');

  const flowModal = document.getElementById('flowModal');
  const flowModalBtn = document.getElementById('flowModalBtn');
  const closeFlowModal = document.getElementById('closeFlowModal');

  const settingsModal = document.getElementById('settingsModal');
  const settingsBtn = document.getElementById('settingsBtn');
  const closeSettingsModal = document.getElementById('closeSettingsModal');
  const customApiKeyInput = document.getElementById('customApiKeyInput');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');

  // Initialize App
  init();

  async function init() {
    setupEventListeners();
    if (customApiKey) customApiKeyInput.value = customApiKey;
    await checkHealth();
    await fetchTools();
  }

  function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const targetTab = btn.getAttribute('data-tab');
        document.getElementById(targetTab).classList.add('active');
      });
    });

    // Preset prompts
    document.querySelectorAll('.chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const prompt = btn.getAttribute('data-prompt');
        userInput.value = prompt;
        sendMessage(prompt);
      });
    });

    // Chat submit
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const message = userInput.value.trim();
      if (message) {
        sendMessage(message);
      }
    });

    // Enter key submit in textarea
    userInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        chatForm.dispatchEvent(new Event('submit'));
      }
    });

    // Auto-grow textarea
    userInput.addEventListener('input', () => {
      userInput.style.height = 'auto';
      userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
    });

    // Clear chat
    clearChatBtn.addEventListener('click', () => {
      messagesContainer.innerHTML = '';
      welcomeHero.style.display = 'flex';
    });

    // Filter tools in registry
    toolSearchInput.addEventListener('input', filterTools);

    // Playground tool selection change
    playgroundToolSelect.addEventListener('change', renderPlaygroundForm);
    runPlaygroundBtn.addEventListener('click', executePlaygroundTool);

    // Add Custom Tool Form
    addToolForm.addEventListener('submit', handleAddCustomTool);

    // Modals
    flowModalBtn.addEventListener('click', () => flowModal.classList.add('active'));
    closeFlowModal.addEventListener('click', () => flowModal.classList.remove('active'));
    
    settingsBtn.addEventListener('click', () => settingsModal.classList.add('active'));
    closeSettingsModal.addEventListener('click', () => settingsModal.classList.remove('active'));

    saveSettingsBtn.addEventListener('click', () => {
      customApiKey = customApiKeyInput.value.trim();
      if (customApiKey) {
        localStorage.setItem('gemini_custom_api_key', customApiKey);
      } else {
        localStorage.removeItem('gemini_custom_api_key');
      }
      settingsModal.classList.remove('active');
      checkHealth();
    });

    // Close modal on backdrop click
    [flowModal, settingsModal].forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
      });
    });
  }

  // API Health Check
  async function checkHealth() {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      if (data.status === 'online') {
        apiStatusDot.classList.add('online');
        apiStatusText.textContent = data.api_key_configured || customApiKey ? 'Connected' : 'Missing API Key';
      }
    } catch (err) {
      apiStatusDot.classList.remove('online');
      apiStatusText.textContent = 'Offline';
    }
  }

  // Fetch Tools Registry
  async function fetchTools() {
    try {
      const res = await fetch('/api/tools');
      const data = await res.json();
      toolsCatalog = data.tools || [];
      
      registeredToolsCount.textContent = toolsCatalog.length;
      sidebarToolCount.textContent = `${toolsCatalog.length} Tools`;

      renderToolsList(toolsCatalog);
      populatePlaygroundSelect(toolsCatalog);
    } catch (err) {
      console.error('Failed to fetch tools:', err);
    }
  }

  // Render Tools List in Sidebar
  function renderToolsList(tools) {
    toolsGrid.innerHTML = '';
    tools.forEach(tool => {
      const card = document.createElement('div');
      card.className = 'tool-card';

      const paramTags = Object.keys(tool.parameters || {}).map(p => 
        `<span class="param-tag">${p}</span>`
      ).join('');

      card.innerHTML = `
        <div class="tool-card-top">
          <span class="tool-card-title"><i class="fa-solid fa-code"></i> ${tool.name}()</span>
          <button class="test-tool-btn" data-tool="${tool.name}">Test Live</button>
        </div>
        <div class="tool-card-desc">${tool.description}</div>
        <div class="tool-params-list">
          <span style="font-size:10px; color:var(--text-muted);">Args:</span>
          ${paramTags || '<span class="param-tag">none</span>'}
        </div>
      `;

      card.querySelector('.test-tool-btn').addEventListener('click', () => {
        // Switch to playground tab & select tool
        document.querySelector('[data-tab="tab-playground"]').click();
        playgroundToolSelect.value = tool.name;
        renderPlaygroundForm();
      });

      toolsGrid.appendChild(card);
    });
  }

  function filterTools() {
    const query = toolSearchInput.value.toLowerCase();
    const filtered = toolsCatalog.filter(t => 
      t.name.toLowerCase().includes(query) || t.description.toLowerCase().includes(query)
    );
    renderToolsList(filtered);
  }

  // Populate Playground Dropdown
  function populatePlaygroundSelect(tools) {
    playgroundToolSelect.innerHTML = '';
    tools.forEach(tool => {
      const opt = document.createElement('option');
      opt.value = tool.name;
      opt.textContent = `${tool.name}() - ${tool.description}`;
      playgroundToolSelect.appendChild(opt);
    });
    renderPlaygroundForm();
  }

  function renderPlaygroundForm() {
    const selectedName = playgroundToolSelect.value;
    const tool = toolsCatalog.find(t => t.name === selectedName);
    playgroundParamsContainer.innerHTML = '';

    if (!tool || !tool.parameters || Object.keys(tool.parameters).length === 0) {
      playgroundParamsContainer.innerHTML = '<span class="hint-text">No parameters required.</span>';
      return;
    }

    Object.keys(tool.parameters).forEach(param => {
      const formGroup = document.createElement('div');
      formGroup.className = 'form-group';
      formGroup.innerHTML = `
        <label for="param_${param}">${param}:</label>
        <input type="number" step="any" id="param_${param}" data-param="${param}" class="form-control" placeholder="Enter number..." required>
      `;
      playgroundParamsContainer.appendChild(formGroup);
    });
  }

  // Execute Playground Tool
  async function executePlaygroundTool() {
    const selectedName = playgroundToolSelect.value;
    const tool = toolsCatalog.find(t => t.name === selectedName);
    if (!tool) return;

    const args = {};
    const inputs = playgroundParamsContainer.querySelectorAll('input[data-param]');
    let valid = true;

    inputs.forEach(input => {
      const val = parseFloat(input.value);
      if (isNaN(val)) {
        valid = false;
        input.style.borderColor = 'var(--accent-rose)';
      } else {
        input.style.borderColor = '';
        args[input.getAttribute('data-param')] = val;
      }
    });

    if (!valid && Object.keys(tool.parameters).length > 0) {
      alert('Please enter valid numeric parameters.');
      return;
    }

    runPlaygroundBtn.disabled = true;
    runPlaygroundBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Executing...';

    try {
      const res = await fetch('/api/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: selectedName, arguments: args })
      });
      const data = await res.json();

      playgroundResultCard.classList.remove('hidden');
      playgroundTime.textContent = `${data.execution_time_ms}ms`;
      playgroundResultCode.textContent = JSON.stringify(data.result !== undefined ? data.result : data, null, 2);
    } catch (err) {
      alert('Error executing tool: ' + err.message);
    } finally {
      runPlaygroundBtn.disabled = false;
      runPlaygroundBtn.innerHTML = '<i class="fa-solid fa-play"></i> Execute Function Directly';
    }
  }

  // Add Dynamic Custom Tool
  async function handleAddCustomTool(e) {
    e.preventDefault();
    const name = document.getElementById('newToolName').value.trim().toLowerCase();
    const desc = document.getElementById('newToolDesc').value.trim();
    const paramsStr = document.getElementById('newToolParams').value.trim();
    const formula = document.getElementById('newToolFormula').value.trim();

    const params = paramsStr.split(',').map(p => p.trim()).filter(p => p.length > 0);

    try {
      const res = await fetch('/api/tools/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: desc, formula, params })
      });
      const data = await res.json();

      if (res.ok) {
        alert(`Success! Function '${name}()' registered into Gemini Agent catalog.`);
        addToolForm.reset();
        await fetchTools();
        document.querySelector('[data-tab="tab-tools"]').click();
      } else {
        alert('Registration failed: ' + (data.detail || 'Unknown error'));
      }
    } catch (err) {
      alert('Failed to register tool: ' + err.message);
    }
  }

  // Send Chat Message to Gemini Tool Agent
  async function sendMessage(message) {
    welcomeHero.style.display = 'none';
    userInput.value = '';
    userInput.style.height = 'auto';

    // Render User Bubble
    renderUserMessage(message);

    // Render Loading Agent Turn
    const agentTurn = createAgentTurnElement();
    messagesContainer.appendChild(agentTurn);
    scrollToBottom();

    sendBtn.disabled = true;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          api_key: customApiKey || undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Agent execution failed');
      }

      // Update Agent Turn with Executed Tool Cards & Final Answer
      updateAgentTurn(agentTurn, data);

      if (data.tool_calls && data.tool_calls.length > 0) {
        totalToolExecutions += data.tool_calls.length;
        totalCallsCount.textContent = totalToolExecutions;
      }

    } catch (err) {
      updateAgentTurnWithError(agentTurn, err.message);
    } finally {
      sendBtn.disabled = false;
      scrollToBottom();
    }
  }

  function renderUserMessage(text) {
    const turn = document.createElement('div');
    turn.className = 'chat-turn user-turn';
    turn.innerHTML = `<div class="user-bubble">${escapeHtml(text)}</div>`;
    messagesContainer.appendChild(turn);
  }

  function createAgentTurnElement() {
    const turn = document.createElement('div');
    turn.className = 'chat-turn agent-turn';
    turn.innerHTML = `
      <div class="agent-wrapper">
        <div class="agent-avatar"><i class="fa-solid fa-bolt-lightning"></i></div>
        <div class="agent-content">
          <div class="agent-response-bubble">
            <span class="hint-text"><i class="fa-solid fa-spinner fa-spin"></i> Gemini is evaluating request and calling tools...</span>
          </div>
        </div>
      </div>
    `;
    return turn;
  }

  function updateAgentTurn(turnElement, data) {
    const contentBox = turnElement.querySelector('.agent-content');
    contentBox.innerHTML = '';

    // If tools were called, render Tool Execution Cards
    if (data.tool_calls && data.tool_calls.length > 0) {
      data.tool_calls.forEach(tool => {
        const toolCard = document.createElement('div');
        toolCard.className = 'tool-execution-card';
        toolCard.innerHTML = `
          <div class="tool-card-header">
            <div class="tool-name-tag">
              <i class="fa-solid fa-bolt accent-cyan"></i> 
              <span>${tool.name}()</span>
              <span class="tool-badge"><i class="fa-solid fa-check"></i> Executed</span>
            </div>
            <div class="tool-timing">⚡ ${tool.execution_time_ms}ms</div>
          </div>
          <div class="tool-card-body">
            <div class="tool-box">
              <div class="tool-box-label">Arguments JSON</div>
              <code>${JSON.stringify(tool.arguments)}</code>
            </div>
            <div class="tool-box">
              <div class="tool-box-label">Returned Result</div>
              <code>${JSON.stringify(tool.result)}</code>
            </div>
          </div>
        `;
        contentBox.appendChild(toolCard);
      });
    }

    // Render Final Markdown Answer
    const responseBubble = document.createElement('div');
    responseBubble.className = 'agent-response-bubble';
    
    // Parse Markdown text
    const parsedHtml = typeof marked !== 'undefined' ? marked.parse(data.answer) : escapeHtml(data.answer);
    responseBubble.innerHTML = parsedHtml;

    contentBox.appendChild(responseBubble);
  }

  function updateAgentTurnWithError(turnElement, errorMsg) {
    const contentBox = turnElement.querySelector('.agent-content');
    contentBox.innerHTML = `
      <div class="agent-response-bubble" style="border-color: var(--accent-rose);">
        <span style="color: var(--accent-rose); font-weight:600;"><i class="fa-solid fa-triangle-exclamation"></i> Error:</span> ${escapeHtml(errorMsg)}
      </div>
    `;
  }

  function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
});
