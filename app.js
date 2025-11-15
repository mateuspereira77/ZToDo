// Estado da aplicação
let todos = JSON.parse(localStorage.getItem('todos')) || [];
let selectedPriority = 'simple'; // Prioridade padrão
let selectedDay = null; // Dia da semana selecionado

// Elementos DOM
const todoForm = document.getElementById('todoForm');
const todoInput = document.getElementById('todoInput');
const todoDescription = document.getElementById('todoDescription');
const todoDate = document.getElementById('todoDate');
const todoCount = document.getElementById('todoCount');
const charCount = document.getElementById('charCount');
const descCount = document.getElementById('descCount');
const priorityButtons = document.querySelectorAll('.priority-btn');

// Elementos DOM da tela de todas as tarefas
const allTodosModal = document.getElementById('allTodosModal');
const viewAllTodosBtn = document.getElementById('viewAllTodosBtn');
const closeAllTodosBtn = document.getElementById('closeAllTodosBtn');
const allTodosList = document.getElementById('allTodosList');
const allTodosCount = document.getElementById('allTodosCount');
let allTodosCurrentFilter = 'all';

// Obter dia da semana de uma data (formato YYYY-MM-DD)
function getDayOfWeekFromDate(dateString) {
    const dateObj = new Date(dateString + 'T00:00:00');
    const dayOfWeek = dateObj.getDay(); // 0 = Domingo, 1 = Segunda, etc.
    
    const dayMap = {
        0: 'domingo',
        1: 'segunda',
        2: 'terca',
        3: 'quarta',
        4: 'quinta',
        5: 'sexta',
        6: 'sabado'
    };
    
    return dayMap[dayOfWeek] || null;
}


// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    // Garantir que tarefas antigas tenham prioridade, descrição, dia e data
    const hasChanges = todos.some(todo => !todo.priority || todo.description === undefined || !todo.day || !todo.date);
    todos = todos.map(todo => ({
        ...todo,
        priority: todo.priority || 'simple',
        description: todo.description || '',
        day: todo.day || null,
        date: todo.date || null
    }));
    if (hasChanges) {
        saveTodos(); // Salvar se houver mudanças
    }
    
    // Detectar automaticamente o dia da semana de hoje (já será definido pelo Flatpickr)
    if (todoDate && todoDate.value) {
        // Converter formato DD/MM/YYYY para YYYY-MM-DD
        const [day, month, year] = todoDate.value.split('/');
        if (day && month && year) {
            const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            const dayOfWeek = getDayOfWeekFromDate(isoDate);
            if (dayOfWeek) {
                selectedDay = dayOfWeek;
            }
        }
    } else {
        // Se não houver data, definir dia de hoje
        const today = new Date();
        const dayOfWeek = getDayOfWeekFromDate(today.toISOString().split('T')[0]);
        if (dayOfWeek) {
            selectedDay = dayOfWeek;
        }
    }
    
    updateStats();
    updateCharCount(); // Inicializar contador de título
    updateDescCount(); // Inicializar contador de descrição
    setupEventListeners();
});

// Configurar event listeners
function setupEventListeners() {
    todoForm.addEventListener('submit', handleAddTodo);
    
    // Atualizar contador de caracteres em tempo real
    todoInput.addEventListener('input', updateCharCount);
    todoDescription.addEventListener('input', updateDescCount);
    
    // Seleção de prioridade
    priorityButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            selectedPriority = btn.dataset.priority;
            priorityButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    // Inicializar Flatpickr com localização pt-BR (aguardar carregamento completo)
    if (todoDate) {
        // Aguardar Flatpickr estar disponível
        const initFlatpickr = () => {
            if (typeof flatpickr !== 'undefined') {
                const flatpickrInstance = flatpickr(todoDate, {
                    locale: 'pt',
                    dateFormat: 'd/m/Y',
                    altInput: false,
                    defaultDate: new Date(),
                    onChange: function(selectedDates, dateStr, instance) {
                        if (dateStr) {
                            // Converter formato DD/MM/YYYY para YYYY-MM-DD para armazenamento
                            const [day, month, year] = dateStr.split('/');
                            const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                            
                            // Detectar e definir o dia da semana automaticamente
                            const dayOfWeek = getDayOfWeekFromDate(isoDate);
                            if (dayOfWeek) {
                                selectedDay = dayOfWeek;
                            }
                        }
                    }
                });
                
                // Armazenar instância do Flatpickr globalmente para uso posterior
                window.flatpickrInstance = flatpickrInstance;
            } else {
                // Se Flatpickr ainda não estiver carregado, tentar novamente
                setTimeout(initFlatpickr, 100);
            }
        };
        
        initFlatpickr();
    }

    // Event listeners para a tela de todas as tarefas
    if (viewAllTodosBtn) {
        viewAllTodosBtn.addEventListener('click', openAllTodosModal);
    }
    
    if (closeAllTodosBtn) {
        closeAllTodosBtn.addEventListener('click', closeAllTodosModal);
    }

    // Fechar modal ao clicar no overlay
    if (allTodosModal) {
        const overlay = allTodosModal.querySelector('.all-todos-overlay');
        if (overlay) {
            overlay.addEventListener('click', closeAllTodosModal);
        }
    }

    // Filtros na modal de todas as tarefas
    const allTodosFilterButtons = document.querySelectorAll('.all-todos-filter-btn');
    allTodosFilterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            allTodosCurrentFilter = btn.dataset.filter;
            allTodosFilterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderAllTodos();
        });
    });

    // Fechar modal com ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (!allTodosModal.classList.contains('hidden')) {
                closeAllTodosModal();
            }
            const postItDetailModal = document.getElementById('postItDetailModal');
            if (postItDetailModal && !postItDetailModal.classList.contains('hidden')) {
                closePostItDetail();
            }
        }
    });
    
    // Fechar modal de detalhes ao clicar no overlay
    const postItDetailModal = document.getElementById('postItDetailModal');
    if (postItDetailModal) {
        const overlay = postItDetailModal.querySelector('.post-it-detail-overlay');
        if (overlay) {
            overlay.addEventListener('click', closePostItDetail);
        }
    }
}

// Atualizar contador de caracteres
function updateCharCount() {
    const length = todoInput.value.length;
    const maxLength = 200;
    charCount.textContent = `${length}/${maxLength}`;
    
    // Mudar cor quando próximo do limite
    if (length >= maxLength * 0.9) {
        charCount.classList.remove('text-gray-500');
        charCount.classList.add('text-orange-500');
    } else if (length >= maxLength * 0.95) {
        charCount.classList.remove('text-orange-500');
        charCount.classList.add('text-red-500');
    } else {
        charCount.classList.remove('text-orange-500', 'text-red-500');
        charCount.classList.add('text-gray-500');
    }
}

// Atualizar contador de caracteres da descrição
function updateDescCount() {
    const length = todoDescription.value.length;
    const maxLength = 500;
    descCount.textContent = `${length}/${maxLength}`;
    
    // Mudar cor quando próximo do limite
    if (length >= maxLength * 0.9) {
        descCount.classList.remove('text-gray-500');
        descCount.classList.add('text-orange-500');
    } else if (length >= maxLength * 0.95) {
        descCount.classList.remove('text-orange-500');
        descCount.classList.add('text-red-500');
    } else {
        descCount.classList.remove('text-orange-500', 'text-red-500');
        descCount.classList.add('text-gray-500');
    }
}

// Adicionar nova tarefa
function handleAddTodo(e) {
    e.preventDefault();
    
    const text = todoInput.value.trim();
    if (!text) {
        alert('Por favor, digite o título da tarefa.');
        return;
    }
    
    if (!todoDate.value) {
        alert('Por favor, selecione uma data.');
        return;
    }
    
    // Converter formato DD/MM/YYYY para YYYY-MM-DD para armazenamento
    const [day, month, year] = todoDate.value.split('/');
    if (!day || !month || !year) {
        alert('Data inválida. Por favor, selecione uma data válida.');
        return;
    }
    const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    
    // Detectar o dia da semana automaticamente da data selecionada
    const dayOfWeek = getDayOfWeekFromDate(isoDate);
    if (!dayOfWeek) {
        alert('Erro ao detectar o dia da semana. Por favor, selecione uma data válida.');
        return;
    }
    selectedDay = dayOfWeek;
    
    const description = todoDescription.value.trim();
    
    const newTodo = {
        id: Date.now(),
        text: text,
        description: description || '', // Descrição opcional
        completed: false,
        priority: selectedPriority,
        day: selectedDay, // Dia da semana
        date: isoDate, // Data no formato YYYY-MM-DD para armazenamento
        createdAt: new Date().toISOString()
    };
    
    todos.unshift(newTodo);
    saveTodos();
    todoInput.value = '';
    todoDescription.value = '';
    selectedDay = null; // Limpar seleção do dia
    updateCharCount(); // Resetar contador
    updateDescCount(); // Resetar contador de descrição
    
    // Limpar o date picker (resetar para hoje)
    if (window.flatpickrInstance) {
        window.flatpickrInstance.setDate(new Date(), false);
    }
    
    updateStats(); // Atualizar estatísticas
    
    // Focar no input novamente
    todoInput.focus();
}

// Alternar status de conclusão
function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    
    const wasCompleted = todo.completed;
    todos = todos.map(t => 
        t.id === id ? { ...t, completed: !t.completed } : t
    );
    saveTodos();
    updateStats(); // Atualizar estatísticas
    
    // Mostrar toast se a tarefa foi concluída (não estava concluída antes)
    if (!wasCompleted && todos.find(t => t.id === id)?.completed) {
        showToast('Tarefa concluída!');
    }
}

// Remover tarefa
function deleteTodo(id) {
    todos = todos.filter(todo => todo.id !== id);
    saveTodos();
    updateStats(); // Atualizar estatísticas
}

// Ordenar tarefas por prioridade
function sortByPriority(todosList) {
    const priorityOrder = { urgent: 0, medium: 1, simple: 2 };
    
    return [...todosList].sort((a, b) => {
        const priorityA = priorityOrder[a.priority || 'simple'];
        const priorityB = priorityOrder[b.priority || 'simple'];
        
        // Se as prioridades forem diferentes, ordenar por prioridade
        if (priorityA !== priorityB) {
            return priorityA - priorityB;
        }
        
        // Se as prioridades forem iguais, manter a ordem original (mais recente primeiro)
        return b.id - a.id;
    });
}


// Atualizar estatísticas
function updateStats() {
    const total = todos.length;
    const active = todos.filter(t => !t.completed).length;
    const completed = todos.filter(t => t.completed).length;
    
    if (todoCount) {
        todoCount.innerHTML = `Você tem <strong>${total} ${total === 1 ? 'tarefa' : 'tarefas'}</strong> cadastradas`;
    }
}

// Salvar no localStorage
function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
}

// Escapar HTML para prevenir XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Mostrar toast de notificação
function showToast(message) {
    const toast = document.getElementById('toastNotification');
    const toastMessage = toast?.querySelector('.toast-message');
    
    if (!toast || !toastMessage) return;
    
    // Definir mensagem
    toastMessage.textContent = message;
    
    // Remover classe hidden e mostrar toast
    toast.classList.remove('hidden');
    
    // Animação de entrada
    setTimeout(() => {
        toast.classList.add('toast-show');
    }, 10);
    
    // Remover toast após 3 segundos
    setTimeout(() => {
        toast.classList.remove('toast-show');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 300); // Aguardar animação de saída
    }, 3000);
}

// Alterar prioridade de uma tarefa
function changePriority(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    
    const priorities = ['simple', 'medium', 'urgent'];
    const currentIndex = priorities.indexOf(todo.priority || 'simple');
    const nextIndex = (currentIndex + 1) % priorities.length;
    todo.priority = priorities[nextIndex];
    
    saveTodos();
    updateStats(); // Atualizar estatísticas
}

// Abrir modal de todas as tarefas
function openAllTodosModal() {
    if (!allTodosModal) return;
    allTodosModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Prevenir scroll do body
    updateStats(); // Atualizar estatísticas antes de abrir
    renderAllTodos();
}

// Fechar modal de todas as tarefas
function closeAllTodosModal() {
    if (!allTodosModal) return;
    allTodosModal.classList.add('hidden');
    document.body.style.overflow = ''; // Restaurar scroll do body
}

// Filtrar tarefas para a modal
function getAllTodosFiltered() {
    let filtered;
    switch(allTodosCurrentFilter) {
        case 'active':
            filtered = todos.filter(todo => !todo.completed);
            break;
        case 'completed':
            filtered = todos.filter(todo => todo.completed);
            break;
        default:
            filtered = todos;
    }
    
    // Ordenar por prioridade
    return sortByPriority(filtered);
}

// Renderizar todas as tarefas na modal
function renderAllTodos() {
    if (!allTodosList || !allTodosCount) return;

    const filteredTodos = getAllTodosFiltered();
    const total = todos.length;
    
    // Atualizar contador
    allTodosCount.textContent = `${total} ${total === 1 ? 'tarefa' : 'tarefas'} no total`;
    
    if (filteredTodos.length === 0) {
        // Definir mensagem baseado no filtro
        let emptyTitle = '';
        let emptySubtitle = '';
        
        if (allTodosCurrentFilter === 'completed') {
            emptyTitle = 'Nenhuma tarefa concluída';
            emptySubtitle = 'Complete algumas tarefas para vê-las aqui!';
        } else if (allTodosCurrentFilter === 'active') {
            emptyTitle = 'Nenhuma tarefa pendente';
            emptySubtitle = 'Todas as suas tarefas estão concluídas!';
        } else {
            emptyTitle = 'Nenhuma tarefa ainda';
            emptySubtitle = 'Adicione uma tarefa para começar!';
        }
        
        // Renderizar mensagem dentro da área da lista
        allTodosList.classList.add('flex', 'flex-col');
        allTodosList.innerHTML = `
            <div class="flex-1 flex items-center justify-center py-12">
                <div class="text-center">
                    <svg class="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <p class="text-gray-500 text-lg">${escapeHtml(emptyTitle)}</p>
                    <p class="text-gray-400 text-sm mt-2">${escapeHtml(emptySubtitle)}</p>
                </div>
            </div>
        `;
        return;
    }
    
    // Remover flex quando houver tarefas para usar grid
    allTodosList.classList.remove('flex', 'flex-col');
    allTodosList.innerHTML = filteredTodos.map(todo => {
        const priority = todo.priority || 'simple';
        const priorityColors = {
            simple: 'text-green-500',
            medium: 'text-yellow-500',
            urgent: 'text-red-500'
        };
        const priorityTitles = {
            simple: 'Tarefa Simples',
            medium: 'Tarefa Mediana',
            urgent: 'Tarefa Urgente'
        };
        
        const postItClass = `post-it-mini post-it-${priority} ${todo.completed ? 'post-it-completed' : ''}`;
        
        // Limitar texto do título para o post-it pequeno
        const shortText = todo.text.length > 50 ? todo.text.substring(0, 50) + '...' : todo.text;
        
        // Formatação da data
        let formattedDate = '';
        if (todo.date) {
            const dateObj = new Date(todo.date + 'T00:00:00');
            const day = String(dateObj.getDate()).padStart(2, '0');
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            formattedDate = `${day}/${month}`;
        }
        
        return `
        <div class="post-it-mini-wrapper cursor-pointer" onclick="openPostItDetail(${todo.id})">
            <div class="${postItClass} p-3 relative h-32 flex flex-col justify-between transition-all hover:scale-105 hover:z-10">
                <div class="flex items-start justify-between gap-1 mb-2">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-1 mb-1">
                            <span class="priority-flag-mini ${priorityColors[priority]}">
                                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clip-rule="evenodd"></path>
                                </svg>
                            </span>
                            ${formattedDate ? `
                                <span class="text-[10px] text-gray-600 font-medium">${escapeHtml(formattedDate)}</span>
                            ` : ''}
                        </div>
                        <p class="text-xs font-medium text-gray-800 leading-tight break-words ${todo.completed ? 'line-through opacity-60' : ''}">
                            ${escapeHtml(shortText)}
                        </p>
                    </div>
                    ${todo.completed ? `
                        <div class="flex-shrink-0 w-4 h-4 rounded-full custom-checkbox-completed flex items-center justify-center">
                            <svg class="w-3 h-3 text-dark-check" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
                            </svg>
                        </div>
                    ` : `
                        <button 
                            onclick="event.stopPropagation(); toggleTodo(${todo.id}); renderAllTodos();"
                            class="flex-shrink-0 w-4 h-4 rounded-full border-2 border-gray-300 hover:border-gray-400 transition-all"
                            title="Marcar como concluída"
                        ></button>
                    `}
                </div>
                ${todo.description && todo.description.trim() ? `
                    <p class="text-[10px] text-gray-600 line-clamp-2 mt-auto">${escapeHtml(todo.description.substring(0, 80))}${todo.description.length > 80 ? '...' : ''}</p>
                ` : ''}
            </div>
        </div>
        `;
    }).join('');
}

// Editar tarefa na modal
function editTodoInModal(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    
    const textElement = document.getElementById(`all-todo-text-${id}`);
    const descriptionElement = document.getElementById(`all-todo-description-${id}`);
    if (!textElement) return;
    
    // Verificar se já está em modo de edição
    if (textElement.querySelector('input')) return;
    
    const currentText = todo.text;
    const currentDescription = todo.description || '';
    
    // Criar input para o texto da tarefa
    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.value = currentText;
    textInput.maxLength = 200;
    textInput.className = 'w-full px-2 py-1 mb-2 border-2 border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 text-gray-800 font-medium text-sm sm:text-base';
    textInput.placeholder = 'Título da tarefa...';
    
    // Criar textarea para a descrição
    const descTextarea = document.createElement('textarea');
    descTextarea.value = currentDescription;
    descTextarea.maxLength = 500;
    descTextarea.rows = 2;
    descTextarea.className = 'w-full px-2 py-1 border-2 border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 text-gray-600 text-xs sm:text-sm resize-none';
    descTextarea.placeholder = 'Descrição (opcional)...';
    
    // Criar container para os inputs
    const editContainer = document.createElement('div');
    editContainer.className = 'w-full';
    editContainer.appendChild(textInput);
    editContainer.appendChild(descTextarea);
    
    // Substituir conteúdo
    const parentContainer = textElement.parentElement;
    const oldDescription = descriptionElement;
    
    textElement.innerHTML = '';
    textElement.appendChild(editContainer);
    if (oldDescription && oldDescription.parentElement) {
        oldDescription.style.display = 'none';
    }
    
    textInput.focus();
    textInput.select();
    
    // Salvar ao pressionar Enter no título ou ao sair do foco
    const saveEdit = () => {
        const newText = textInput.value.trim();
        const newDescription = descTextarea.value.trim();
        
        if (newText && (newText !== currentText || newDescription !== currentDescription)) {
            todo.text = newText;
            todo.description = newDescription || '';
            saveTodos();
            renderAllTodos();
            updateStats();
        } else if (!newText) {
            renderAllTodos();
            updateStats();
        } else {
            renderAllTodos();
            updateStats();
        }
    };
    
    // Cancelar ao pressionar Escape
    const cancelEdit = () => {
        renderAllTodos();
        updateStats();
    };
    
    textInput.addEventListener('blur', () => {
        setTimeout(() => {
            if (!descTextarea.matches(':focus')) {
                saveEdit();
            }
        }, 200);
    });
    
    descTextarea.addEventListener('blur', saveEdit);
    
    textInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            descTextarea.focus();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelEdit();
        }
    });
    
    descTextarea.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            cancelEdit();
        } else if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            saveEdit();
        }
    });
}

// Abrir detalhes do post-it
function openPostItDetail(id, editMode = false) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    
    const modal = document.getElementById('postItDetailModal');
    const content = document.getElementById('postItDetailContent');
    if (!modal || !content) return;
    
    const priority = todo.priority || 'simple';
    const priorityColors = {
        simple: 'text-green-500',
        medium: 'text-yellow-500',
        urgent: 'text-red-500'
    };
    const priorityTitles = {
        simple: 'Tarefa Simples',
        medium: 'Tarefa Mediana',
        urgent: 'Tarefa Urgente'
    };
    const priorityBg = {
        simple: 'bg-green-50 border-green-200',
        medium: 'bg-yellow-50 border-yellow-200',
        urgent: 'bg-red-50 border-red-200'
    };
    
    // Formatação do dia da semana
    const weekDaysFull = {
        'domingo': 'Domingo',
        'segunda': 'Segunda-feira',
        'terca': 'Terça-feira',
        'quarta': 'Quarta-feira',
        'quinta': 'Quinta-feira',
        'sexta': 'Sexta-feira',
        'sabado': 'Sábado'
    };
    const dayName = todo.day ? weekDaysFull[todo.day] || todo.day : '';
    
    // Formatação da data
    let formattedDate = '';
    let dateForInput = '';
    if (todo.date) {
        const dateObj = new Date(todo.date + 'T00:00:00');
        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const year = dateObj.getFullYear();
        const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                           'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        formattedDate = `${day} de ${monthNames[dateObj.getMonth()]} de ${year}`;
        dateForInput = todo.date; // YYYY-MM-DD
    }
    
    // Renderizar título e descrição como campos editáveis ou texto
    const titleField = editMode ? `
        <input 
            type="text" 
            id="editTitle-${todo.id}" 
            value="${escapeHtml(todo.text)}" 
            maxlength="200"
            class="w-full text-2xl sm:text-3xl font-bold text-gray-800 bg-white border-2 border-blue-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="Título da tarefa..."
        >
    ` : `
        <h2 
            id="titleDisplay-${todo.id}" 
            class="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 ${todo.completed ? 'line-through opacity-60' : ''} cursor-pointer hover:bg-white/50 rounded-lg p-2 -ml-2 transition-all"
            onclick="enableEditMode(${todo.id})"
            title="Clique para editar"
        >
            ${escapeHtml(todo.text)}
        </h2>
    `;
    
    const descField = `
        <div class="mb-6">
            <h3 class="text-sm font-semibold text-gray-700 mb-2">Descrição:</h3>
            <p 
                id="descDisplay-${todo.id}" 
                class="text-gray-700 whitespace-pre-wrap leading-relaxed cursor-pointer hover:bg-white/50 rounded-lg p-2 -ml-2 transition-all min-h-[3rem]"
                onclick="enableEditMode(${todo.id})"
                title="Clique para editar"
            >
                ${todo.description && todo.description.trim() ? escapeHtml(todo.description) : '<span class="text-gray-400 italic">Clique para adicionar descrição...</span>'}
            </p>
        </div>
    `;
    
    content.innerHTML = `
        <div class="post-it-detail ${priorityBg[priority]} border-2 rounded-2xl p-6 sm:p-8">
            <div class="flex justify-between items-start mb-6">
                <div class="flex-1">
                    <div class="flex items-center gap-3 mb-3">
                        <span class="${priorityColors[priority]}">
                            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clip-rule="evenodd"></path>
                            </svg>
                        </span>
                        <span class="text-sm font-semibold ${priorityColors[priority]}">${priorityTitles[priority]}</span>
                    </div>
                    ${titleField}
                    ${editMode ? `
                        <div class="mb-6">
                            <h3 class="text-sm font-semibold text-gray-700 mb-2">Descrição:</h3>
                            <textarea 
                                id="editDesc-${todo.id}" 
                                maxlength="500"
                                rows="4"
                                class="w-full text-gray-700 bg-white border-2 border-blue-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                                placeholder="Descrição (opcional)..."
                            >${escapeHtml(todo.description || '')}</textarea>
                        </div>
                    ` : descField}
                </div>
                <button 
                    onclick="closePostItDetail()"
                    class="text-gray-500 hover:text-gray-700 transition-colors p-2 rounded-lg hover:bg-white/50"
                    title="Fechar"
                >
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            
            ${editMode ? `
                <div class="mb-6">
                    <label class="text-sm font-semibold text-gray-700 mb-2 block">Data:</label>
                    <input 
                        type="date" 
                        id="editDate-${todo.id}" 
                        value="${dateForInput}"
                        class="w-full bg-white border-2 border-blue-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                </div>
            ` : ''}
            
            ${!editMode ? `
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    ${dayName ? `
                        <div>
                            <h3 class="text-sm font-semibold text-gray-700 mb-1">Dia da Semana:</h3>
                            <p class="text-gray-600">${escapeHtml(dayName)}</p>
                        </div>
                    ` : ''}
                    ${formattedDate ? `
                        <div>
                            <h3 class="text-sm font-semibold text-gray-700 mb-1">Data:</h3>
                            <p class="text-gray-600">${escapeHtml(formattedDate)}</p>
                        </div>
                    ` : ''}
                    <div>
                        <h3 class="text-sm font-semibold text-gray-700 mb-1">Status:</h3>
                        <p class="text-gray-600">${todo.completed ? '✅ Concluída' : '⏳ Pendente'}</p>
                    </div>
                </div>
            ` : ''}
            
            <div class="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
                ${editMode ? `
                    <button 
                        onclick="savePostItEdit(${todo.id})"
                        class="px-4 py-2 rounded-lg font-medium bg-green-500 text-white hover:bg-green-600 transition-all"
                    >
                        ✓ Salvar Alterações
                    </button>
                    <button 
                        onclick="openPostItDetail(${todo.id}, false)"
                        class="px-4 py-2 rounded-lg font-medium bg-gray-500 text-white hover:bg-gray-600 transition-all"
                    >
                        ✗ Cancelar
                    </button>
                ` : `
                    <button 
                        onclick="toggleTodo(${todo.id}); openPostItDetail(${todo.id}); renderAllTodos();"
                        class="px-4 py-2 rounded-lg font-medium transition-all ${todo.completed ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-green-500 text-white hover:bg-green-600'}"
                    >
                        ${todo.completed ? '✏️ Reabrir Tarefa' : '✓ Concluir Tarefa'}
                    </button>
                    <button 
                        onclick="changePriority(${todo.id}); openPostItDetail(${todo.id}); renderAllTodos();"
                        class="px-4 py-2 rounded-lg font-medium bg-blue-500 text-white hover:bg-blue-600 transition-all"
                    >
                        🔖 Alterar Prioridade
                    </button>
                    <button 
                        onclick="enableEditMode(${todo.id})"
                        class="px-4 py-2 rounded-lg font-medium bg-yellow-500 text-white hover:bg-yellow-600 transition-all"
                    >
                        ✏️ Editar
                    </button>
                    <button 
                        onclick="if(confirm('Tem certeza que deseja excluir esta tarefa?')) { deleteTodo(${todo.id}); closePostItDetail(); renderAllTodos(); }"
                        class="px-4 py-2 rounded-lg font-medium bg-red-500 text-white hover:bg-red-600 transition-all"
                    >
                        🗑️ Excluir
                    </button>
                `}
            </div>
        </div>
    `;
    
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // Animação de entrada
    setTimeout(() => {
        content.classList.add('post-it-detail-show');
        if (editMode) {
            const titleInput = document.getElementById(`editTitle-${todo.id}`);
            if (titleInput) {
                titleInput.focus();
                titleInput.select();
            }
        }
    }, 10);
}

// Habilitar modo de edição
function enableEditMode(id) {
    openPostItDetail(id, true);
}

// Salvar edição do post-it
function savePostItEdit(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    
    const titleInput = document.getElementById(`editTitle-${id}`);
    const descInput = document.getElementById(`editDesc-${id}`);
    const dateInput = document.getElementById(`editDate-${id}`);
    
    if (!titleInput) return;
    
    const newText = titleInput.value.trim();
    const newDescription = descInput ? descInput.value.trim() : todo.description || '';
    const newDate = dateInput ? dateInput.value : todo.date || null;
    
    if (!newText) {
        alert('O título da tarefa não pode estar vazio.');
        titleInput.focus();
        return;
    }
    
    // Atualizar tarefa
    todo.text = newText;
    todo.description = newDescription;
    
    if (newDate) {
        todo.date = newDate;
        // Atualizar dia da semana baseado na nova data
        const dayOfWeek = getDayOfWeekFromDate(newDate);
        if (dayOfWeek) {
            todo.day = dayOfWeek;
        }
    }
    
    saveTodos();
    updateStats();
    
    // Reabrir modal em modo visualização
    openPostItDetail(id, false);
    renderAllTodos();
}

// Fechar detalhes do post-it
function closePostItDetail() {
    const modal = document.getElementById('postItDetailModal');
    const content = document.getElementById('postItDetailContent');
    if (!modal || !content) return;
    
    content.classList.remove('post-it-detail-show');
    setTimeout(() => {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }, 300);
}

// Tornar funções globais para uso em onclick
window.toggleTodo = toggleTodo;
window.deleteTodo = deleteTodo;
window.changePriority = changePriority;
window.renderAllTodos = renderAllTodos;
window.editTodoInModal = editTodoInModal;
window.openPostItDetail = openPostItDetail;
window.closePostItDetail = closePostItDetail;
window.enableEditMode = enableEditMode;
window.savePostItEdit = savePostItEdit;

