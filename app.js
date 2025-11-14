// Estado da aplicação
let todos = JSON.parse(localStorage.getItem('todos')) || [];
let currentFilter = 'all';
let selectedPriority = 'simple'; // Prioridade padrão

// Elementos DOM
const todoForm = document.getElementById('todoForm');
const todoInput = document.getElementById('todoInput');
const todoList = document.getElementById('todoList');
const todoCount = document.getElementById('todoCount');
const emptyState = document.getElementById('emptyState');
const clearCompletedBtn = document.getElementById('clearCompleted');
const filterButtons = document.querySelectorAll('.filter-btn');
const charCount = document.getElementById('charCount');
const priorityButtons = document.querySelectorAll('.priority-btn');

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    // Garantir que tarefas antigas tenham prioridade
    todos = todos.map(todo => ({
        ...todo,
        priority: todo.priority || 'simple'
    }));
    if (todos.some(todo => !todo.priority)) {
        saveTodos(); // Salvar se houver mudanças
    }
    
    renderTodos();
    updateStats();
    setupEventListeners();
});

// Configurar event listeners
function setupEventListeners() {
    todoForm.addEventListener('submit', handleAddTodo);
    clearCompletedBtn.addEventListener('click', handleClearCompleted);
    
    // Atualizar contador de caracteres em tempo real
    todoInput.addEventListener('input', updateCharCount);
    
    // Seleção de prioridade
    priorityButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            selectedPriority = btn.dataset.priority;
            priorityButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            currentFilter = btn.dataset.filter;
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderTodos();
        });
    });
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

// Adicionar nova tarefa
function handleAddTodo(e) {
    e.preventDefault();
    
    const text = todoInput.value.trim();
    if (!text) return;
    
    const newTodo = {
        id: Date.now(),
        text: text,
        completed: false,
        priority: selectedPriority,
        createdAt: new Date().toISOString()
    };
    
    todos.unshift(newTodo);
    saveTodos();
    todoInput.value = '';
    updateCharCount(); // Resetar contador
    renderTodos();
    updateStats();
    
    // Focar no input novamente
    todoInput.focus();
}

// Alternar status de conclusão
function toggleTodo(id) {
    todos = todos.map(todo => 
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
    saveTodos();
    renderTodos();
    updateStats();
}

// Remover tarefa
function deleteTodo(id) {
    todos = todos.filter(todo => todo.id !== id);
    saveTodos();
    renderTodos();
    updateStats();
}

// Limpar tarefas concluídas
function handleClearCompleted() {
    todos = todos.filter(todo => !todo.completed);
    saveTodos();
    renderTodos();
    updateStats();
}

// Filtrar tarefas
function getFilteredTodos() {
    let filtered;
    switch(currentFilter) {
        case 'active':
            filtered = todos.filter(todo => !todo.completed);
            break;
        case 'completed':
            filtered = todos.filter(todo => todo.completed);
            break;
        default:
            filtered = todos;
    }
    
    // Ordenar por prioridade: urgent > medium > simple
    return sortByPriority(filtered);
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

// Renderizar lista de tarefas
function renderTodos() {
    const filteredTodos = getFilteredTodos();
    
    if (filteredTodos.length === 0) {
        todoList.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    todoList.innerHTML = filteredTodos.map(todo => {
        const priority = todo.priority || 'simple'; // Fallback para tarefas antigas
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
        
        return `
        <div class="todo-item flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all border border-gray-200 ${todo.completed ? 'todo-completed' : ''}">
            <button 
                onclick="toggleTodo(${todo.id})"
                class="flex-shrink-0 w-6 h-6 rounded-full border-2 ${todo.completed ? 'custom-checkbox-completed' : 'border-gray-300'} flex items-center justify-center transition-all hover:scale-110"
            >
                ${todo.completed ? `
                    <svg class="w-4 h-4 text-dark-check" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
                    </svg>
                ` : ''}
            </button>
            <button 
                onclick="changePriority(${todo.id})"
                class="flex-shrink-0 priority-flag ${priorityColors[priority]} hover:opacity-80 transition-all p-1"
                title="${priorityTitles[priority]} - Clique para alterar"
            >
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clip-rule="evenodd"></path>
                </svg>
            </button>
            <span class="todo-text flex-1 text-gray-800 ${todo.completed ? '' : 'font-medium'}" id="todo-text-${todo.id}">
                ${escapeHtml(todo.text)}
            </span>
            <div class="flex gap-1">
                <button 
                    onclick="editTodo(${todo.id})"
                    class="flex-shrink-0 text-blue-500 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition-all"
                    title="Editar tarefa"
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                </button>
                <button 
                    onclick="deleteTodo(${todo.id})"
                    class="flex-shrink-0 text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-all"
                    title="Excluir tarefa"
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
            </div>
        </div>
    `;
    }).join('');
}

// Atualizar estatísticas
function updateStats() {
    const total = todos.length;
    const active = todos.filter(t => !t.completed).length;
    const completed = todos.filter(t => t.completed).length;
    
    todoCount.textContent = `${total} ${total === 1 ? 'tarefa' : 'tarefas'}`;
    
    if (completed > 0) {
        clearCompletedBtn.style.display = 'block';
    } else {
        clearCompletedBtn.style.display = 'none';
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

// Alterar prioridade de uma tarefa
function changePriority(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    
    const priorities = ['simple', 'medium', 'urgent'];
    const currentIndex = priorities.indexOf(todo.priority || 'simple');
    const nextIndex = (currentIndex + 1) % priorities.length;
    todo.priority = priorities[nextIndex];
    
    saveTodos();
    renderTodos();
}

// Editar tarefa
function editTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    
    const textElement = document.getElementById(`todo-text-${id}`);
    if (!textElement) return;
    
    // Verificar se já está em modo de edição
    if (textElement.querySelector('input')) return;
    
    const currentText = todo.text;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentText;
    input.maxLength = 200;
    input.className = 'flex-1 px-2 py-1 border-2 border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 text-gray-800 font-medium';
    
    // Substituir o span pelo input
    textElement.innerHTML = '';
    textElement.appendChild(input);
    input.focus();
    input.select();
    
    // Salvar ao pressionar Enter
    const saveEdit = () => {
        const newText = input.value.trim();
        if (newText && newText !== currentText) {
            todo.text = newText;
            saveTodos();
            renderTodos();
        } else if (!newText) {
            // Se estiver vazio, restaurar o texto original
            renderTodos();
        } else {
            // Se não mudou, apenas renderizar novamente
            renderTodos();
        }
    };
    
    // Cancelar ao pressionar Escape
    const cancelEdit = () => {
        renderTodos();
    };
    
    input.addEventListener('blur', saveEdit);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            input.blur();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelEdit();
        }
    });
}

// Tornar funções globais para uso em onclick
window.toggleTodo = toggleTodo;
window.deleteTodo = deleteTodo;
window.changePriority = changePriority;
window.editTodo = editTodo;

