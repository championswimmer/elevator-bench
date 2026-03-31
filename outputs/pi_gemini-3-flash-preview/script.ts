import { Building, NUM_FLOORS, NUM_ELEVATORS } from './Building.ts';
import { Direction } from './Elevator.ts';

const building = new Building();

document.addEventListener('DOMContentLoaded', () => {
    const floorsContainer = document.getElementById('floors');
    const elevatorsContainer = document.getElementById('elevators');

    // Create floors
    for (let i = NUM_FLOORS - 1; i >= 0; i--) {
        const floorElement = document.createElement('div');
        floorElement.className = 'floor';
        floorElement.innerHTML = `
            <div class="floor-num">Floor ${i}</div>
            <div class="floor-btns">
                ${i < NUM_FLOORS - 1 ? `<button class="floor-btn up" data-floor="${i}">UP</button>` : ''}
                ${i > 0 ? `<button class="floor-btn down" data-floor="${i}">DOWN</button>` : ''}
            </div>
        `;
        floorsContainer?.appendChild(floorElement);
    }

    // Create elevators
    for (let i = 0; i < NUM_ELEVATORS; i++) {
        const elevatorElement = document.createElement('div');
        elevatorElement.className = 'elevator';
        elevatorElement.id = `elevator-${i}`;
        elevatorElement.style.bottom = '0px';
        
        // Buttons inside elevator
        let innerBtns = '';
        for (let j = 0; j < NUM_FLOORS; j++) {
            innerBtns += `<button class="inner-btn" data-elevator="${i}" data-floor="${j}">${j}</button>`;
        }
        elevatorElement.innerHTML = `<div class="inner-btns">${innerBtns}</div>`;
        
        elevatorsContainer?.appendChild(elevatorElement);
    }

    // Floor button click handlers
    document.querySelectorAll('.floor-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const floor = parseInt((e.target as HTMLElement).dataset.floor!);
            const direction = (e.target as HTMLElement).classList.contains('up') ? Direction.UP : Direction.DOWN;
            building.requestElevator(floor, direction);
            (e.target as HTMLButtonElement).disabled = true;
        });
    });

    // Inner button click handlers
    document.querySelectorAll('.inner-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const elevatorId = parseInt((e.target as HTMLElement).dataset.elevator!);
            const floor = parseInt((e.target as HTMLElement).dataset.floor!);
            building.elevators[elevatorId].addTarget(floor);
            building.updateElevatorStatus(elevatorId);
            (e.target as HTMLButtonElement).classList.add('active');
        });
    });

    // Handle elevator movement animation
    window.addEventListener('elevator-move', (e: any) => {
        const { id, floor } = e.detail;
        const elevator = document.getElementById(`elevator-${id}`);
        if (elevator) {
            elevator.style.transition = `bottom ${Math.abs(building.elevators[id].currentFloor - floor) * 1000}ms linear`;
            elevator.style.bottom = `${floor * 60}px`; // Each floor height is 60px
        }
    });

    window.addEventListener('elevator-stopped', (e: any) => {
        const { id, floor } = e.detail;
        const elevatorBtn = document.querySelector(`.inner-btn[data-elevator="${id}"][data-floor="${floor}"]`);
        if (elevatorBtn) {
            elevatorBtn.classList.remove('active');
        }
        
        // Re-enable floor buttons when an elevator arrives
        const upBtn = document.querySelector(`.floor-btn.up[data-floor="${floor}"]`) as HTMLButtonElement;
        const downBtn = document.querySelector(`.floor-btn.down[data-floor="${floor}"]`) as HTMLButtonElement;
        if (upBtn) upBtn.disabled = false;
        if (downBtn) downBtn.disabled = false;
    });
});
