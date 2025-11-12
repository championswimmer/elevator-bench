// Test script for elevator simulation
console.log('Testing Elevator Simulator...');

// Wait for the simulator to be ready
setTimeout(() => {
    if (window.elevatorSimulator) {
        console.log('✓ Simulator initialized successfully');
        
        // Test basic functionality
        const simulator = window.elevatorSimulator;
        
        // Test 1: Check building state
        const state = simulator.getCurrentState();
        console.log('Building state:', {
            floors: state.totalFloors,
            elevators: state.totalElevators
        });
        
        // Test 2: Test floor button press
        console.log('Testing floor 5 up button...');
        const success = simulator.handleFloorButtonPress(5, 'up');
        console.log('Floor button press result:', success ? '✓ Success' : '✗ Failed');
        
        // Test 3: Test elevator button press
        console.log('Testing elevator 0 button to floor 8...');
        const elevatorSuccess = simulator.handleElevatorButtonPress(0, 8);
        console.log('Elevator button press result:', elevatorSuccess ? '✓ Success' : '✗ Failed');
        
        // Test 4: Check elevator metrics
        const metrics = simulator.getElevatorMetrics();
        console.log('Elevator metrics:', metrics);
        
        // Test 5: Check pending requests
        const requests = simulator.getPendingRequests();
        console.log('Pending requests:', requests);
        
        console.log('✓ All tests completed!');
    } else {
        console.error('✗ Simulator not found on window object');
    }
}, 1000);