(function () {
  function init() {
    if (document.getElementById('form-filler-shadow-host')) return;
    if (!document.body) {
      setTimeout(init, 50);
      return;
    }

    // 1. Crear el Shadow Host para aislar completamente estilos
    const shadowHost = document.createElement('div');
    shadowHost.id = 'form-filler-shadow-host';
    // Estilo base para el host
    shadowHost.style.position = 'fixed';
    shadowHost.style.zIndex = '999999';
    shadowHost.style.bottom = '20px';
    shadowHost.style.right = '20px';
    shadowHost.style.width = 'auto';
    shadowHost.style.height = 'auto';
    document.body.appendChild(shadowHost);

    const shadowRoot = shadowHost.attachShadow({ mode: 'open' });

  // 2. Insertar estilos de la UI (CSS aislado)
  const styles = document.createElement('style');
  styles.textContent = `
    /* --- Botón Flotante --- */
    .floating-btn {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #4285f4, #34a853);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border: none;
      outline: none;
    }
    
    .floating-btn:hover {
      transform: scale(1.08) rotate(10deg);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
    }
    
    .floating-btn:active {
      transform: scale(0.95);
    }

    .floating-btn svg {
      width: 28px;
      height: 28px;
      fill: white;
    }

    /* --- Modal Contenedor --- */
    .modal-container {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.9);
      width: 420px;
      height: 600px;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      opacity: 0;
      pointer-events: none;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 10000000;
    }

    .modal-container.show {
      opacity: 1;
      pointer-events: auto;
      transform: translate(-50%, -50%) scale(1);
    }

    /* --- Cabecera del Modal --- */
    .modal-header {
      background: #f1f3f4;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: move; /* Indica que es arrastrable */
      user-select: none;
      border-bottom: 1px solid #e0e0e0;
    }

    .modal-title {
      font-family: 'Outfit', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 15px;
      font-weight: 600;
      color: #3c4043;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .modal-title svg {
      width: 18px;
      height: 18px;
      fill: #4285f4;
    }

    .close-btn {
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 4px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    }

    .close-btn:hover {
      background: rgba(0, 0, 0, 0.08);
    }

    .close-btn svg {
      width: 20px;
      height: 20px;
      fill: #5f6368;
    }

    /* --- Iframe de la extensión --- */
    .modal-iframe {
      flex: 1;
      border: none;
      width: 100%;
      height: 100%;
    }
  `;
  shadowRoot.appendChild(styles);

  // 3. Crear el Botón Flotante
  const button = document.createElement('button');
  button.className = 'floating-btn';
  // SVG de un Rayo estilizado (Zap Icon)
  button.innerHTML = `
    <svg viewBox="0 0 24 24">
      <path d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.12-.22.13-.24C8.71 10.43 11.23 6 15 1h1l-1 7h3.5c.42 0 .58.27.42.59l-.04.1C17.3 11.8 14.88 16.5 11 21z"/>
    </svg>
  `;
  shadowRoot.appendChild(button);

  // 4. Crear el Modal
  const modal = document.createElement('div');
  modal.className = 'modal-container';

  // Obtener la URL de popup.html inyectando la propiedad del Chrome Extension
  const extensionUrl = chrome.runtime.getURL('popup.html');

  modal.innerHTML = `
    <div class="modal-header">
      <div class="modal-title">
        <svg viewBox="0 0 24 24">
          <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
        </svg>
        <span>Form Filler - Llenador automático</span>
      </div>
      <button class="close-btn" title="Cerrar">
        <svg viewBox="0 0 24 24">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    </div>
    <iframe class="modal-iframe" src="${extensionUrl}"></iframe>
  `;
  shadowRoot.appendChild(modal);

  // 5. Interactividad del botón y cerrado
  const closeBtn = modal.querySelector('.close-btn');

  function toggleModal() {
    modal.classList.toggle('show');
  }

  button.addEventListener('click', toggleModal);
  closeBtn.addEventListener('click', () => {
    modal.classList.remove('show');
  });

  // 6. Funcionalidad de Arrastrar (Drag & Drop) para el Modal
  const header = modal.querySelector('.modal-header');
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;
  let xOffset = 0;
  let yOffset = 0;

  header.addEventListener('mousedown', dragStart);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', dragEnd);

  function dragStart(e) {
    // Solo arrastrar si es click izquierdo en la cabecera o hijos que no sean el botón cerrar
    if (e.button !== 0 || e.target.closest('.close-btn')) return;

    // Calcular la posición inicial considerando transform translate(-50%, -50%)
    const rect = modal.getBoundingClientRect();
    
    // Al arrastrar, quitamos temporalmente las clases/estilos que centran con translate 
    // y fijamos posiciones absolutas respecto al viewport para facilitar el movimiento continuo
    initialX = e.clientX - xOffset;
    initialY = e.clientY - yOffset;

    isDragging = true;
  }

  function drag(e) {
    if (!isDragging) return;

    e.preventDefault();
    currentX = e.clientX - initialX;
    currentY = e.clientY - initialY;

    xOffset = currentX;
    yOffset = currentY;

    // Mover el modal usando translate3d para mayor rendimiento de GPU
    // Mantenemos el translate original (-50%, -50%) sumando el offset en pixeles
    modal.style.transform = `translate(calc(-50% + ${currentX}px), calc(-50% + ${currentY}px)) scale(1)`;
  }

  function dragEnd(e) {
    isDragging = false;
  }

  }

  init();
})();
