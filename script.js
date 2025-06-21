class PortSimulation {
    constructor() {
        this.ships = [];
        this.docks = [
            { id: 1, occupied: false, ship: null, loading: false },
            { id: 2, occupied: false, ship: null, loading: false },
            { id: 3, occupied: false, ship: null, loading: false },
            { id: 4, occupied: false, ship: null, loading: false }
        ];
        this.waitingShips = [];
        this.shipCounter = 1;
        this.autoGenerateMode = false;
        this.activeOperations = 0;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateUI();
        this.startAutoGeneration();
    }

    bindEvents() {
        document.getElementById('generate-ship').addEventListener('click', () => {
            this.generateShip();
        });

        document.getElementById('auto-generate').addEventListener('click', () => {
            this.toggleAutoGenerate();
        });

        document.getElementById('dock-next-ship').addEventListener('click', () => {
            this.dockNextShip();
        });

        document.getElementById('unload-all').addEventListener('click', () => {
            this.unloadAllShips();
        });

        document.getElementById('emergency-evacuation').addEventListener('click', () => {
            this.emergencyEvacuation();
        });

        // Événements pour les navires en attente
        document.getElementById('waiting-ships').addEventListener('click', (e) => {
            if (e.target.classList.contains('ship')) {
                const shipId = parseInt(e.target.dataset.shipId);
                this.dockSpecificShip(shipId);
            }
        });
    }

    generateShip(auto = false) {
        const shipName = auto ? this.generateRandomShipName() : 
                        document.getElementById('ship-name').value || `Navire-${this.shipCounter}`;
        const shipType = auto ? this.getRandomShipType() : 
                        document.getElementById('ship-type').value;
        const cargoAmount = auto ? Math.floor(Math.random() * 4500) + 500 : 
                           parseInt(document.getElementById('cargo-amount').value);

        const ship = {
            id: this.shipCounter++,
            name: shipName,
            type: shipType,
            cargo: cargoAmount,
            arrivalTime: new Date(),
            status: 'waiting'
        };

        this.waitingShips.push(ship);
        this.ships.push(ship);
        
        this.addLog(`🚢 Nouveau navire arrivé: ${ship.name} (${ship.type}) - ${ship.cargo}t`, 'system');
        
        if (!auto) {
            document.getElementById('ship-name').value = '';
            document.getElementById('cargo-amount').value = '1000';
        }

        this.updateUI();
        this.checkAutoDocking();
    }

    generateRandomShipName() {
        const prefixes = ['MS', 'MV', 'SS', 'RMS'];
        const names = ['Aurora', 'Neptune', 'Voyager', 'Explorer', 'Titan', 'Phoenix', 'Odyssey', 'Atlantic', 'Pacific', 'Mediterranean'];
        const suffixes = ['Express', 'Star', 'Princess', 'Majesty', 'Glory', 'Victory'];
        
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const name = names[Math.floor(Math.random() * names.length)];
        const suffix = Math.random() > 0.5 ? ' ' + suffixes[Math.floor(Math.random() * suffixes.length)] : '';
        
        return `${prefix} ${name}${suffix}`;
    }

    getRandomShipType() {
        const types = ['cargo', 'tanker', 'container', 'passenger'];
        return types[Math.floor(Math.random() * types.length)];
    }

    dockNextShip() {
        if (this.waitingShips.length === 0) {
            this.addLog('❌ Aucun navire en attente', 'warning');
            return;
        }

        const availableDock = this.docks.find(dock => !dock.occupied);
        if (!availableDock) {
            this.addLog('❌ Aucun quai disponible', 'warning');
            return;
        }

        const ship = this.waitingShips.shift();
        this.dockShip(ship, availableDock);
    }

    dockSpecificShip(shipId) {
        const shipIndex = this.waitingShips.findIndex(ship => ship.id === shipId);
        if (shipIndex === -1) return;

        const availableDock = this.docks.find(dock => !dock.occupied);
        if (!availableDock) {
            this.addLog('❌ Aucun quai disponible', 'warning');
            return;
        }

        const ship = this.waitingShips.splice(shipIndex, 1)[0];
        this.dockShip(ship, availableDock);
    }

    dockShip(ship, dock) {
        dock.occupied = true;
        dock.ship = ship;
        dock.loading = true;
        this.activeOperations++;

        ship.status = 'docked';
        ship.dockTime = new Date();

        this.addLog(`⚓ ${ship.name} accoste au Quai ${dock.id}`, 'success');
        this.updateUI();

        // Simuler le chargement/déchargement
        const loadingTime = Math.random() * 8000 + 3000; // 3-11 secondes
        setTimeout(() => {
            this.completeLoading(dock);
        }, loadingTime);
    }

    completeLoading(dock) {
        if (!dock.ship) return;

        dock.loading = false;
        this.activeOperations--;
        
        this.addLog(`📦 Chargement/déchargement terminé pour ${dock.ship.name}`, 'success');
        
        // Le navire part après un délai
        setTimeout(() => {
            this.departShip(dock);
        }, 2000);
        
        this.updateUI();
    }

    departShip(dock) {
        if (!dock.ship) return;

        const ship = dock.ship;
        this.addLog(`🌊 ${ship.name} quitte le port`, 'system');
        
        dock.occupied = false;
        dock.ship = null;
        dock.loading = false;

        // Retirer le navire de la liste des navires
        const shipIndex = this.ships.findIndex(s => s.id === ship.id);
        if (shipIndex !== -1) {
            this.ships.splice(shipIndex, 1);
        }

        this.updateUI();
        this.checkAutoDocking();
    }

    unloadAllShips() {
        const loadingDocks = this.docks.filter(dock => dock.loading);
        if (loadingDocks.length === 0) {
            this.addLog('❌ Aucune opération de chargement en cours', 'warning');
            return;
        }

        loadingDocks.forEach(dock => {
            this.completeLoading(dock);
        });
        
        this.addLog(`⚡ Déchargement accéléré pour ${loadingDocks.length} navires`, 'success');
    }

    emergencyEvacuation() {
        const occupiedDocks = this.docks.filter(dock => dock.occupied);
        if (occupiedDocks.length === 0) {
            this.addLog('❌ Aucun navire à évacuer', 'warning');
            return;
        }

        occupiedDocks.forEach(dock => {
            if (dock.ship) {
                this.addLog(`🚨 Évacuation d'urgence: ${dock.ship.name}`, 'error');
                this.departShip(dock);
            }
        });

        this.waitingShips = [];
        this.addLog('🚨 ÉVACUATION D\'URGENCE TERMINÉE - Tous les navires ont quitté le port', 'error');
        this.updateUI();
    }

    checkAutoDocking() {
        if (this.waitingShips.length > 0) {
            const availableDock = this.docks.find(dock => !dock.occupied);
            if (availableDock && Math.random() > 0.3) { // 70% de chance d'accostage automatique
                setTimeout(() => {
                    this.dockNextShip();
                }, 1000);
            }
        }
    }

    toggleAutoGenerate() {
        this.autoGenerateMode = !this.autoGenerateMode;
        const button = document.getElementById('auto-generate');
        
        if (this.autoGenerateMode) {
            button.textContent = 'Arrêter Auto';
            button.classList.remove('btn-secondary');
            button.classList.add('btn-danger');
            this.addLog('🤖 Mode automatique activé', 'system');
        } else {
            button.textContent = 'Mode Automatique';
            button.classList.remove('btn-danger');
            button.classList.add('btn-secondary');
            this.addLog('🤖 Mode automatique désactivé', 'system');
        }
    }

    startAutoGeneration() {
        setInterval(() => {
            if (this.autoGenerateMode && this.waitingShips.length < 8) {
                if (Math.random() > 0.7) { // 30% de chance par intervalle
                    this.generateShip(true);
                }
            }
        }, 3000);
    }

    updateUI() {
        // Mettre à jour les statistiques
        document.getElementById('ships-count').textContent = this.ships.length;
        document.getElementById('available-docks').textContent = 
            this.docks.filter(dock => !dock.occupied).length;
        document.getElementById('active-operations').textContent = this.activeOperations;

        // Mettre à jour les quais
        this.docks.forEach(dock => {
            const dockElement = document.getElementById(`dock-${dock.id}`);
            const statusElement = dockElement.querySelector('.dock-status');
            const shipSlot = dockElement.querySelector('.ship-slot');

            dockElement.className = 'dock';
            
            if (dock.occupied && dock.ship) {
                if (dock.loading) {
                    dockElement.classList.add('loading');
                    statusElement.textContent = 'Chargement...';
                } else {
                    dockElement.classList.add('occupied');
                    statusElement.textContent = 'Prêt à partir';
                }
                
                shipSlot.innerHTML = `
                    <div class="docked-ship ship-${dock.ship.type}">
                        ${dock.ship.name}<br>
                        <small>${dock.ship.cargo}t</small>
                    </div>
                `;
            } else {
                statusElement.textContent = 'Libre';
                shipSlot.innerHTML = '';
            }
        });

        // Mettre à jour les navires en attente
        const waitingShipsContainer = document.getElementById('waiting-ships');
        waitingShipsContainer.innerHTML = '';
        
        this.waitingShips.forEach(ship => {
            const shipElement = document.createElement('div');
            shipElement.className = `ship ship-${ship.type}`;
            shipElement.dataset.shipId = ship.id;
            shipElement.innerHTML = `${ship.name}<br><small>${ship.cargo}t</small>`;
            waitingShipsContainer.appendChild(shipElement);
        });
    }

    addLog(message, type = 'system') {
        const logsContainer = document.getElementById('operation-logs');
        const logEntry = document.createElement('p');
        logEntry.className = `log-entry ${type}`;
        
        const timestamp = new Date().toLocaleTimeString();
        logEntry.innerHTML = `[${timestamp}] ${message}`;
        
        logsContainer.appendChild(logEntry);
        logsContainer.scrollTop = logsContainer.scrollHeight;

        // Limiter à 50 entrées de log
        const logEntries = logsContainer.querySelectorAll('.log-entry');
        if (logEntries.length > 50) {
            logEntries[0].remove();
        }
    }
}

// Initialiser la simulation quand la page est chargée
document.addEventListener('DOMContentLoaded', () => {
    new PortSimulation();
});