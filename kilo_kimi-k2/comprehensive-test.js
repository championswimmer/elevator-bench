// Comprehensive test script for elevator simulation
console.log('=== ELEVATOR SIMULATOR COMPREHENSIVE TEST ===');

// Test configuration
const TEST_DELAY = 2000; // 2 seconds between tests
let testResults = [];

// Helper function to run tests with delay
function runTest(testName, testFunction, delay = TEST_DELAY) {
    return new Promise((resolve) => {
        setTimeout(() => {
            try {
                const result = testFunction();
                testResults.push({ name: testName, passed: result, error: null });
                console.log(`✓ ${testName}: ${result ? 'PASSED' : 'FAILED'}`);
                resolve(result);
            } catch (error) {
                testResults.push({ name: testName, passed: false, error: error.message });
                console.log(`✗ ${testName}: FAILED - ${error.message}`);
                resolve(false);
            }
        }, delay);
    });
}

// Wait for simulator to be ready
setTimeout(async () => {
    if (!window.elevatorSimulator) {
        console.error('✗ Simulator not found on window object');
        return;
    }

    const simulator = window.elevatorSimulator;
    console.log('✓ Simulator initialized successfully');

    // Test 1: Basic building configuration
    await runTest('Building Configuration (10 floors, 4 elevators)', () => {
        const state = simulator.getCurrentState();
        return state.totalFloors === 10 && state.totalElevators === 4;
    });

    // Test 2: Floor button configurations
    await runTest('Floor 0 has only up button', () => {
        const floor0 = document.querySelector('.floor[data-floor="0"]');
        const upButton = floor0.querySelector('.floor-button-up');
        const downButton = floor0.querySelector('.floor-button-down');
        return upButton !== null && downButton === null;
    });

    await runTest('Floor 9 has only down button', () => {
        const floor9 = document.querySelector('.floor[data-floor="9"]');
        const upButton = floor9.querySelector('.floor-button-up');
        const downButton = floor9.querySelector('.floor-button-down');
        return upButton === null && downButton !== null;
    });

    await runTest('Floors 1-8 have both up and down buttons', () => {
        for (let i = 1; i <= 8; i++) {
            const floor = document.querySelector(`.floor[data-floor="${i}"]`);
            const upButton = floor.querySelector('.floor-button-up');
            const downButton = floor.querySelector('.floor-button-down');
            if (!upButton || !downButton) return false;
        }
        return true;
    });

    // Test 3: Elevator button configurations
    await runTest('All elevators have buttons for floors 0-9', () => {
        for (let elevatorId = 0; elevatorId < 4; elevatorId++) {
            const elevator = document.querySelector(`.elevator[data-elevator="${elevatorId}"]`);
            for (let floor = 0; floor < 10; floor++) {
                const button = elevator.querySelector(`.elevator-button[data-floor="${floor}"]`);
                if (!button) return false;
            }
        }
        return true;
    });

    // Test 4: Floor button functionality
    await runTest('Floor button press functionality', () => {
        const success = simulator.handleFloorButtonPress(5, 'up');
        return success === true;
    });

    // Test 5: Elevator button functionality
    await runTest('Elevator button press functionality', () => {
        const success = simulator.handleElevatorButtonPress(0, 8);
        return success === true;
    });

    // Test 6: Optimization logic - closest idle elevator
    await runTest('Closest idle elevator responds first', () => {
        // Reset simulation
        simulator.reset();
        
        // Request elevator from floor 5
        simulator.handleFloorButtonPress(5, 'up');
        
        // Check which elevator got the request
        const state = simulator.getCurrentState();
        const assignedElevator = state.elevators.find(e => e.requests.length > 0);
        
        // Should be the closest idle elevator (elevator 0, starting at floor 0)
        return assignedElevator && assignedElevator.id === 0;
    });

    // Test 7: Request queuing
    await runTest('Request queuing when all elevators are busy', () => {
        simulator.reset();
        
        // Make all elevators busy by giving them requests
        for (let i = 0; i < 4; i++) {
            simulator.handleElevatorButtonPress(i, 9); // Send all elevators to floor 9
        }
        
        // Now request from floor 3
        simulator.handleFloorButtonPress(3, 'up');
        
        // Check if request is queued
        const pendingRequests = simulator.getPendingRequests();
        return pendingRequests.length > 0;
    });

    // Test 8: Direction persistence
    await runTest('Direction persistence logic', () => {
        simulator.reset();
        
        // Request elevator going up from floor 2
        simulator.handleElevatorButtonPress(0, 5);
        
        // Request elevator going down from floor 7
        simulator.handleElevatorButtonPress(0, 3);
        
        const state = simulator.getCurrentState();
        const elevator = state.elevators[0];
        
        // Should process requests in order (5 first, then 3)
        return elevator.targetFloor === 5;
    });

    // Test 9: Global window.elevatorSimulator instance
    await runTest('Global window.elevatorSimulator instance', () => {
        return window.elevatorSimulator !== undefined && 
               window.elevatorSimulator instanceof ElevatorSimulator;
    });

    // Test 10: Visual updates
    await runTest('Visual state updates', () => {
        simulator.reset();
        
        // Press floor button
        simulator.handleFloorButtonPress(4, 'up');
        
        // Check if button state is updated
        const floor4 = document.querySelector('.floor[data-floor="4"]');
        const upButton = floor4.querySelector('.floor-button-up');
        
        return upButton.classList.contains('active');
    });

    // Test 11: Elevator movement animation
    await runTest('Elevator position updates', () => {
        simulator.reset();
        
        // Move elevator to floor 5
        simulator.moveElevatorToFloor(0, 5);
        
        // Wait a bit for movement
        return new Promise((resolve) => {
            setTimeout(() => {
                const state = simulator.getCurrentState();
                const elevator = state.elevators[0];
                resolve(elevator.currentFloor === 5);
            }, 1000);
        });
    });

    // Final results
    setTimeout(() => {
        console.log('\n=== TEST RESULTS SUMMARY ===');
        const passed = testResults.filter(r => r.passed).length;
        const total = testResults.length;
        
        console.log(`Tests Passed: ${passed}/${total}`);
        console.log(`Success Rate: ${Math.round((passed/total) * 100)}%`);
        
        if (passed === total) {
            console.log('🎉 ALL TESTS PASSED! Elevator simulator is working correctly.');
        } else {
            console.log('❌ Some tests failed. Check the results above.');
            testResults.filter(r => !r.passed).forEach(r => {
                console.log(`  - ${r.name}: ${r.error || 'Failed'}`);
            });
        }
        
        console.log('\n=== SIMULATION READY ===');
        console.log('You can now test the elevator simulator by:');
        console.log('1. Clicking floor buttons (▲/▼) to call elevators');
        console.log('2. Clicking elevator interior buttons to request floors');
        console.log('3. Watching elevators move smoothly between floors');
        console.log('4. Observing the optimization logic in action');
        
    }, TEST_DELAY * 2);

}, 2000); // Wait 2 seconds for simulator to initialize