class ResourceRelay {
    constructor() {
        this.gridSize = 5;
        this.grid = [];
        this.playerPosition = { x: 0, y: 0 };
        this.targetPosition = { x: 4, y: 4 };
        this.moves = 20;
        this.resources = 0;
        this.delivered = 0;
        this.targetResources = 10;
        this.score = 0;
        this.gameOver = false;
        this.history = [];
        this.difficulty = 'easy';
        this.initialize();
    }

    initialize() {
        // Reset game state
        this.playerPosition = { x: 0, y: 0 };
        this.resources = 0;
        this.delivered = 0;
        this.score = 0;
        this.gameOver = false;
        this.history = [];

        // Hide victory panel
        document.getElementById('victoryPanel').classList.remove('visible');

        // Create empty grid
        for (let i = 0; i < this.gridSize; i++) {
            this.grid[i] = [];
            for (let j = 0; j < this.gridSize; j++) {
                this.grid[i][j] = {
                    resources: 0,
                    isObstacle: false,
                    isBonus: false
                };
            }
        }

        // Place resources, obstacles, and bonuses
        this.placeGameElements();
        this.updateUI();
    }

    placeGameElements() {
        // Clear existing elements
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                if ((i !== 0 || j !== 0) && (i !== this.targetPosition.x || j !== this.targetPosition.y)) {
                    this.grid[i][j] = {
                        resources: 0,
                        isObstacle: false,
                        isBonus: false
                    };
                }
            }
        }

        // Place resources - Hard mode has more concentrated resource spots
        const resourceCount = this.difficulty === 'easy' ? 8 : 6;
        for (let i = 0; i < resourceCount; i++) {
            let x, y;
            do {
                x = Math.floor(Math.random() * this.gridSize);
                y = Math.floor(Math.random() * this.gridSize);
            } while (
                (x === 0 && y === 0) || 
                (x === this.targetPosition.x && y === this.targetPosition.y) ||
                this.grid[x][y].resources > 0 ||
                this.grid[x][y].isObstacle ||
                // Ensure resources aren't placed too far from the path
                (this.difficulty === 'hard' && (x + y > 6))
            );
            // Hard mode has more resources per cell but concentrated closer to the path
            this.grid[x][y].resources = this.difficulty === 'easy' ? 
                Math.floor(Math.random() * 3) + 2 : 
                Math.floor(Math.random() * 2) + 3;
        }

        // Place obstacles - Reduced obstacles for hard mode and better placement
        const obstacleCount = this.difficulty === 'easy' ? 3 : 5;
        for (let i = 0; i < obstacleCount; i++) {
            let x, y;
            let attempts = 0;
            const maxAttempts = 20;
            
            do {
                x = Math.floor(Math.random() * this.gridSize);
                y = Math.floor(Math.random() * this.gridSize);
                attempts++;
                
                // If we can't find a suitable spot after many attempts, skip this obstacle
                if (attempts >= maxAttempts) {
                    break;
                }
            } while (
                (x === 0 && y === 0) || 
                (x === this.targetPosition.x && y === this.targetPosition.y) ||
                this.grid[x][y].resources > 0 ||
                this.grid[x][y].isObstacle ||
                // Prevent obstacles from blocking critical paths in hard mode
                (this.difficulty === 'hard' && (
                    (x === 1 && y === 0) || 
                    (x === 0 && y === 1) ||
                    (x === this.targetPosition.x - 1 && y === this.targetPosition.y) ||
                    (x === this.targetPosition.x && y === this.targetPosition.y - 1)
                ))
            );

            // Only place the obstacle if we found a suitable spot
            if (attempts < maxAttempts) {
                this.grid[x][y].isObstacle = true;
            }
        }

        // Place bonus cells - Adjusted bonus count for hard mode
        const bonusCount = this.difficulty === 'easy' ? 3 : 2;
        for (let i = 0; i < bonusCount; i++) {
            let x, y;
            do {
                x = Math.floor(Math.random() * this.gridSize);
                y = Math.floor(Math.random() * this.gridSize);
            } while (
                (x === 0 && y === 0) || 
                (x === this.targetPosition.x && y === this.targetPosition.y) ||
                this.grid[x][y].resources > 0 ||
                this.grid[x][y].isObstacle ||
                this.grid[x][y].isBonus
            );
            this.grid[x][y].isBonus = true;
        }
    }

    movePlayer(x, y) {
        if (this.gameOver) return false;
        if (this.moves <= 0) {
            this.endGame(false);
            return false;
        }

        // Check if move is valid
        if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) {
            this.showMessage("Cannot move outside the grid!", "error");
            return false;
        }

        // Check for obstacles
        if (this.grid[x][y].isObstacle) {
            this.showMessage("Cannot move to obstacle!", "error");
            return false;
        }

        // Save current state for undo
        this.saveState();

        // Update position
        this.playerPosition = { x, y };
        this.moves--;

        // Check for bonus
        if (this.grid[x][y].isBonus) {
            const bonusMoves = this.difficulty === 'easy' ? 3 : 2;
            this.moves += bonusMoves;
            this.grid[x][y].isBonus = false;
            this.showMessage(`Bonus! +${bonusMoves} moves! 🎉`, "success");
        }

        this.updateUI();
        return true;
    }

    collectResource() {
        if (this.gameOver) return;
        const cell = this.grid[this.playerPosition.x][this.playerPosition.y];
        
        if (cell.resources > 0) {
            this.saveState();
            this.resources += cell.resources;
            cell.resources = 0;
            this.showMessage(`Collected resources! 💎`, "success");
            this.updateUI();
        } else {
            this.showMessage("No resources to collect here!", "error");
        }
    }

    deliverResource() {
        if (this.gameOver) return;
        if (this.playerPosition.x === this.targetPosition.x && 
            this.playerPosition.y === this.targetPosition.y) {
            if (this.resources > 0) {
                this.saveState();
                this.delivered += this.resources;
                this.resources = 0;
                this.showMessage("Resources delivered! 📦", "success");
                this.updateUI();

                if (this.delivered >= this.targetResources) {
                    this.endGame(true);
                }
            } else {
                this.showMessage("No resources to deliver!", "error");
            }
        } else {
            this.showMessage("Must be at target location to deliver!", "error");
        }
    }

    saveState() {
        const state = {
            playerPosition: { ...this.playerPosition },
            grid: JSON.parse(JSON.stringify(this.grid)),
            moves: this.moves,
            resources: this.resources,
            delivered: this.delivered,
            score: this.score
        };
        this.history.push(state);
    }

    undoMove() {
        if (this.history.length === 0) {
            this.showMessage("No moves to undo!", "error");
            return;
        }

        const previousState = this.history.pop();
        this.playerPosition = previousState.playerPosition;
        this.grid = previousState.grid;
        this.moves = previousState.moves;
        this.resources = previousState.resources;
        this.delivered = previousState.delivered;
        this.score = previousState.score;
        this.updateUI();
        this.showMessage("Move undone! ↩️", "success");
    }

    getHint() {
        // Simple hint system - find nearest resource or target
        let nearestResource = null;
        let minDistance = Infinity;

        if (this.resources > 0) {
            // If carrying resources, suggest moving to target
            this.showHint(this.targetPosition.x, this.targetPosition.y);
            return;
        }

        // Find nearest resource
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                if (this.grid[i][j].resources > 0) {
                    const distance = Math.abs(this.playerPosition.x - i) + 
                                  Math.abs(this.playerPosition.y - j);
                    if (distance < minDistance) {
                        minDistance = distance;
                        nearestResource = { x: i, y: j };
                    }
                }
            }
        }

        if (nearestResource) {
            this.showHint(nearestResource.x, nearestResource.y);
        } else {
            this.showMessage("No resources left to collect!", "error");
        }
    }

    showHint(x, y) {
        const cell = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
        cell.style.animation = "pulse 1s 3";
        setTimeout(() => {
            cell.style.animation = "";
        }, 3000);
    }

    endGame(won) {
        this.gameOver = true;
        if (won) {
            this.score = this.calculateScore();
            this.showMessage(`Victory! Final Score: ${this.score} 🏆`, "success");
            // Show victory panel
            document.getElementById('victoryPanel').classList.add('visible');
        } else {
            this.showMessage("Game Over! Out of moves! 💔", "error");
        }
        this.updateUI();
    }

    calculateScore() {
        const baseScore = this.delivered * 100;
        const moveBonus = this.moves * 10;
        const difficultyMultiplier = this.difficulty === 'easy' ? 1 : 2;
        return (baseScore + moveBonus) * difficultyMultiplier;
    }

    showMessage(text, type) {
        const messageBox = document.getElementById('messageBox');
        messageBox.textContent = text;
        messageBox.className = `message ${type}`;
        setTimeout(() => {
            messageBox.textContent = '';
            messageBox.className = 'message';
        }, 3000);
    }

    updateUI() {
        // Update status panel
        document.getElementById('moves').textContent = `🔢 Moves: ${this.moves}`;
        document.getElementById('resources').textContent = `⛏ Gems: ${this.resources}`;
        document.getElementById('delivered').textContent = 
            `📦 Delivered: ${this.delivered}/${this.targetResources}`;
        document.getElementById('score').textContent = `Score: ${this.score}`;

        // Update grid
        const gameGrid = document.getElementById('gameGrid');
        gameGrid.innerHTML = '';

        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.x = i;
                cell.dataset.y = j;

                // Add cell content
                if (i === this.playerPosition.x && j === this.playerPosition.y) {
                    cell.innerHTML = '👷';
                    cell.classList.add('active');
                } else if (i === this.targetPosition.x && j === this.targetPosition.y) {
                    cell.innerHTML = '🎯';
                    cell.classList.add('target');
                } else if (this.grid[i][j].isObstacle) {
                    cell.innerHTML = '🚫';
                    cell.classList.add('obstacle');
                } else if (this.grid[i][j].isBonus) {
                    cell.innerHTML = '⭐';
                    cell.classList.add('bonus');
                } else if (this.grid[i][j].resources > 0) {
                    cell.innerHTML = '💎'.repeat(this.grid[i][j].resources);
                }

                // Add click handler for movement
                cell.addEventListener('click', () => {
                    if (!this.grid[i][j].isObstacle && !this.gameOver) {
                        const dx = Math.abs(this.playerPosition.x - i);
                        const dy = Math.abs(this.playerPosition.y - j);
                        if (dx + dy === 1) { // Allow only adjacent moves
                            this.movePlayer(i, j);
                        } else {
                            this.showMessage("Can only move to adjacent cells!", "error");
                        }
                    }
                });

                gameGrid.appendChild(cell);
            }
        }
    }
}

// Initialize game
let game;

function startGame() {
    game = new ResourceRelay();
    // Set initial active difficulty button
    updateDifficultyButtons('easy');
}

function setDifficulty(difficulty) {
    // Update game settings
    game.difficulty = difficulty;
    game.moves = difficulty === 'easy' ? 20 : 15; // Increased moves for hard mode
    game.targetResources = difficulty === 'easy' ? 10 : 15; // Reduced target for hard mode
    
    // Reset and reinitialize the game
    game.initialize();
    
    // Update difficulty buttons
    updateDifficultyButtons(difficulty);
    
    // Show message about difficulty change
    game.showMessage(`Switched to ${difficulty} mode! Game reset.`, "success");
}

function updateDifficultyButtons(activeDifficulty) {
    const buttons = document.querySelectorAll('.difficulty-selector button');
    buttons.forEach(button => {
        button.classList.remove('active');
        if (button.textContent.toLowerCase() === activeDifficulty) {
            button.classList.add('active');
        }
    });
}

function collectResource() {
    game.collectResource();
}

function deliverResource() {
    game.deliverResource();
}

function undoMove() {
    game.undoMove();
}

function getHint() {
    game.getHint();
}

// Start game when page loads
window.onload = startGame;