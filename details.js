class PortDetails {
    constructor() {
        this.operations = [];
        this.trucks = [];
        this.containers = [];
        this.gates = {
            north: { busy: false, currentTruck: null, waitTime: 0 },
            south: { busy: false, currentTruck: null, waitTime: 0 }
        };
        this.congestionLevel = 0;
        this.totalContainers = 0;
        this.totalShips = 0;
        this.totalProcessingTime = 0;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadFromLocalStorage();
        this.startGateSimulation();
        this.updateUI();
    }

    bindEvents() {
        document.getElementById('process-truck').addEventListener('click', () => {
            this.processTruck();
        });

        document.getElementById('manual-alert').addEventListener('click', () => {
            this.simulateCongestion();
        });

        // Écouteur pour les messages depuis la page principale
        window.addEventListener('storage', (event) => {
            if (event.key === 'portOperation') {
                const operation = JSON.parse(event.newValue);
                this.addOperation(operation.type, operation.message, operation.details);
            }
        });
    }

    loadFromLocalStorage() {
        const savedOperations = localStorage.getItem('portOperations');
        if (savedOperations) {
            this.operations = JSON.parse(savedOperations);
        }

        const savedStats = localStorage.getItem('portStats');
        if (savedStats) {
            const stats = JSON.parse(savedStats);
            this.totalContainers = stats.totalContainers || 0;
            this.totalShips = stats.totalShips || 0;
            this.totalProcessingTime = stats.totalProcessingTime || 0;
        }
    }

    saveToLocalStorage() {
        localStorage.setItem('portOperations', JSON.stringify(this.operations));
        localStorage.setItem('portStats', JSON.stringify({
            totalContainers: this.totalContainers,
            totalShips: this.totalShips,
            totalProcessingTime: this.totalProcessingTime
        }));
    }

    addOperation(type, message, details = {}) {
        const timestamp = new Date();
        const operation = {
            id: Date.now(),
            timestamp,
            type,
            message,
            details
        };

        this.operations.unshift(operation); // Ajout au début pour un ordre chronologique inverse

        // Mettre à jour les statistiques
        if (type === 'ship-arrival') {
            this.totalShips++;
        } else if (type === 'container-move') {
            this.totalContainers += details.containers || 1;
            if (details.processingTime) {
                this.totalProcessingTime += details.processingTime;
            }
        }

        this.updateUI();
        this.saveToLocalStorage();

        // Ajouter à la timeline
        this.addToTimeline(operation);
        this.addToHistoryTable(operation);
    }

    addToTimeline(operation) {
        const timeline = document.getElementById('operations-timeline');
        const item = document.createElement('div');
        item.className = `timeline-item ${operation.type}`;
        
        const time = document.createElement('div');
        time.className = 'timeline-time';
        time.textContent = operation.timestamp.toLocaleTimeString();
        
        const content = document.createElement('div');
        content.className = 'timeline-content';
        content.innerHTML = `<strong>${operation.message}</strong>`;
        
        if (operation.details && Object.keys(operation.details).length > 0) {
            const details = document.createElement('div');
            details.className = 'timeline-details text-muted small';
            details.textContent = this.formatDetails(operation.details);
            content.appendChild(details);
        }
        
        item.appendChild(time);
        item.appendChild(content);
        
        timeline.insertBefore(item, timeline.firstChild);
        
        // Limiter à 50 éléments
        if (timeline.children.length > 50) {
            timeline.removeChild(timeline.lastChild);
        }
    }

    addToHistoryTable(operation) {
        const table = document.getElementById('history-table');
        const row = document.createElement('tr');
        
        const timeCell = document.createElement('td');
        timeCell.textContent = operation.timestamp.toLocaleTimeString();
        
        const typeCell = document.createElement('td');
        typeCell.textContent = this.getTypeLabel(operation.type);
        
        const eventCell = document.createElement('td');
        eventCell.textContent = operation.message;
        
        const detailsCell = document.createElement('td');
        detailsCell.textContent = this.formatDetails(operation.details);
        
        const statusCell = document.createElement('td');
        statusCell.innerHTML = this.getStatusBadge(operation.type);
        
        row.appendChild(timeCell);
        row.appendChild(typeCell);
        row.appendChild(eventCell);
        row.appendChild(detailsCell);
        row.appendChild(statusCell);
        
        table.insertBefore(row, table.firstChild);
    }

    getTypeLabel(type) {
        const labels = {
            'ship-arrival': 'Arrivée Navire',
            'ship-departure': 'Départ Navire',
            'operation': 'Opération Portuaire',
            'truck': 'Transport Terrestre',
            'container-move': 'Mouvement Conteneur',
            'gate': 'Contrôle Porte',
            'alert': 'Alerte'
        };
        return labels[type] || type;
    }

    getStatusBadge(type) {
        const badges = {
            'ship-arrival': '<span class="badge bg-success">Terminé</span>',
            'ship-departure': '<span class="badge bg-success">Terminé</span>',
            'operation': '<span class="badge bg-primary">En cours</span>',
            'truck': '<span class="badge bg-warning">En traitement</span>',
            'container-move': '<span class="badge bg-info">Complété</span>',
            'gate': '<span class="badge bg-secondary">Actif</span>',
            'alert': '<span class="badge bg-danger">Urgent</span>'
        };
        return badges[type] || '<span class="badge bg-light text-dark">Inconnu</span>';
    }

    formatDetails(details) {
        if (!details) return '';
        return Object.entries(details)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');
    }

    processTruck() {
        const truckId = document.getElementById('truck-id').value.trim() || `TRK-${Math.floor(1000 + Math.random() * 9000)}`;
        const containerId = document.getElementById('container-id').value.trim() || `CNTR-${Math.floor(10000 + Math.random() * 90000)}`;
        const destination = document.getElementById('destination').value;
        
        if (!truckId || !containerId) {
            alert('Veuillez saisir un ID camion et un ID conteneur');
            return;
        }
        
        // Choisir une porte disponible
        const gate = this.gates.north.busy ? 
                    (this.gates.south.busy ? null : 'south') : 'north';
        
        if (!gate) {
            this.addOperation('alert', 'Congestion aux portes - Camion mis en attente', {
                truckId,
                containerId,
                destination
            });
            this.increaseCongestion();
            return;
        }
        
        // Enregistrer le camion
        const truck = {
            id: truckId,
            containerId,
            destination,
            gate,
            entryTime: new Date(),
            processed: false
        };
        
        this.trucks.push(truck);
        this.gates[gate].busy = true;
        this.gates[gate].currentTruck = truck;
        
        this.addOperation('truck', `Camion ${truckId} en traitement à la porte ${gate.toUpperCase()}`, {
            containerId,
            destination
        });
        
        // Simuler le traitement
        setTimeout(() => {
            this.completeTruckProcessing(truck, gate);
        }, Math.random() * 5000 + 3000); // 3-8 secondes
        
        // Effacer les champs
        document.getElementById('truck-id').value = '';
        document.getElementById('container-id').value = '';
        
        this.updateUI();
    }

    completeTruckProcessing(truck, gate) {
        truck.processed = true;
        truck.exitTime = new Date();
        this.gates[gate].busy = false;
        this.gates[gate].currentTruck = null;
        
        const processingTime = Math.floor((truck.exitTime - truck.entryTime) / 1000 / 60); // en minutes
        
        this.addOperation('truck', `Camion ${truck.id} a quitté le port`, {
            containerId: truck.containerId,
            destination: truck.destination,
            processingTime: `${processingTime} min`
        });
        
        this.addOperation('container-move', `Conteneur ${truck.containerId} chargé pour ${truck.destination}`, {
            truckId: truck.id,
            processingTime
        });
        
        this.updateUI();
        this.checkCongestion();
    }

    startGateSimulation() {
        // Simuler l'arrivée aléatoire de camions
        setInterval(() => {
            if (Math.random() > 0.7 && this.trucks.length < 10) { // 30% de chance
                const destinations = ['Yaoundé', 'Douala', 'N\'Djamena', 'Bangui', 'Autre'];
                const truck = {
                    id: `TRK-AUTO-${Math.floor(1000 + Math.random() * 9000)}`,
                    containerId: `CNTR-AUTO-${Math.floor(10000 + Math.random() * 90000)}`,
                    destination: destinations[Math.floor(Math.random() * destinations.length)],
                    entryTime: new Date(),
                    processed: false
                };
                
                this.trucks.push(truck);
                this.addOperation('truck', `Camion ${truck.id} arrivé automatiquement`, {
                    containerId: truck.containerId,
                    destination: truck.destination
                });
                
                this.processAutoTruck(truck);
            }
            
            // Mettre à jour les temps d'attente
            this.updateGateWaitTimes();
        }, 8000);
    }

    processAutoTruck(truck) {
        // Trouver une porte disponible
        const gate = this.gates.north.busy ? 
                    (this.gates.south.busy ? null : 'south') : 'north';
        
        if (!gate) {
            this.addOperation('alert', 'Congestion - Camion automatique en attente', {
                truckId: truck.id
            });
            this.increaseCongestion();
            return;
        }
        
        this.gates[gate].busy = true;
        this.gates[gate].currentTruck = truck;
        truck.gate = gate;
        
        this.addOperation('truck', `Camion automatique ${truck.id} en traitement à la porte ${gate.toUpperCase()}`);
        
        // Simuler le traitement
        setTimeout(() => {
            this.completeTruckProcessing(truck, gate);
        }, Math.random() * 6000 + 4000); // 4-10 secondes
        
        this.updateUI();
    }

    updateGateWaitTimes() {
        // Mettre à jour les temps d'attente pour les camions en attente
        this.trucks.forEach(truck => {
            if (!truck.gate && !truck.processed) {
                const waitTime = Math.floor((new Date() - truck.entryTime) / 1000 / 60); // en minutes
                if (waitTime > 5) {
                    this.increaseCongestion();
                }
            }
        });
        
        this.updateUI();
    }

    increaseCongestion() {
        this.congestionLevel++;
        if (this.congestionLevel >= 3) {
            this.addOperation('alert', 'Alerte congestion - Délais d\'attente élevés aux portes');
            this.updateCongestionAlert();
        }
    }

    checkCongestion() {
        if (this.trucks.filter(t => !t.processed).length < 3) {
            this.congestionLevel = Math.max(0, this.congestionLevel - 1);
        }
        this.updateCongestionAlert();
    }

    updateCongestionAlert() {
        const alertElement = document.getElementById('congestion-alert');
        
        if (this.congestionLevel >= 3) {
            alertElement.className = 'alert alert-danger';
            alertElement.textContent = 'CONGESTION ÉLEVÉE - Délais d\'attente importants';
        } else if (this.congestionLevel >= 1) {
            alertElement.className = 'alert alert-warning';
            alertElement.textContent = 'Congestion modérée - Surveillance requise';
        } else {
            alertElement.className = 'alert alert-info';
            alertElement.textContent = 'Flux normal - Aucune congestion détectée';
        }
    }

    simulateCongestion() {
        this.congestionLevel = 3;
        this.addOperation('alert', 'ALERTE MANUELLE - Congestion simulée aux portes');
        this.updateCongestionAlert();
        
        // Ajouter plusieurs camions en attente
        for (let i = 0; i < 5; i++) {
            const truck = {
                id: `TRK-CONG-${Math.floor(1000 + Math.random() * 9000)}`,
                containerId: `CNTR-CONG-${Math.floor(10000 + Math.random() * 90000)}`,
                destination: 'Yaoundé',
                entryTime: new Date(),
                processed: false
            };
            this.trucks.push(truck);
            this.addOperation('truck', `Camion congestion ${truck.id} en attente`);
        }
        
        this.updateUI();
    }

    updateUI() {
        // Mettre à jour les statistiques
        document.getElementById('total-ships').textContent = this.totalShips;
        document.getElementById('total-containers').textContent = this.totalContainers;
        
        const avgTime = this.totalShips > 0 ? 
            Math.round(this.totalProcessingTime / this.totalShips) : 0;
        document.getElementById('avg-time').textContent = `${avgTime} min`;
        
        // Mettre à jour l'état des portes
        this.updateGateUI('north');
        this.updateGateUI('south');
        
        // Mettre à jour la table d'historique si elle est vide
        if (document.getElementById('history-table').children.length === 0) {
            this.operations.forEach(op => this.addToHistoryTable(op));
        }
    }

    updateGateUI(gate) {
        const gateElement = document.querySelector(`.gate-${gate}`);
        const badge = gateElement.querySelector('.badge');
        const truckElement = document.getElementById(`${gate}-truck`);
        const waitElement = document.getElementById(`${gate}-wait`);
        
        if (this.gates[gate].busy) {
            badge.className = 'badge bg-danger';
            badge.textContent = 'Occupé';
            truckElement.textContent = this.gates[gate].currentTruck?.id || 'Inconnu';
            
            const waitTime = Math.floor((new Date() - this.gates[gate].currentTruck.entryTime) / 1000 / 60);
            waitElement.textContent = `${waitTime} min`;
            
            gateElement.style.borderLeftColor = '#dc3545';
        } else {
            badge.className = 'badge bg-success';
            badge.textContent = 'Libre';
            truckElement.textContent = 'Aucun';
            waitElement.textContent = '0 min';
            
            gateElement.style.borderLeftColor = '#28a745';
        }
    }
}

// Initialiser quand la page est chargée
document.addEventListener('DOMContentLoaded', () => {
    const portDetails = new PortDetails();
    
    // Charger les opérations depuis la simulation principale si elles existent
    const mainOperations = localStorage.getItem('portOperations');
    if (mainOperations) {
        JSON.parse(mainOperations).forEach(op => {
            portDetails.addOperation(op.type, op.message, op.details);
        });
    }
});