export const config = {
    canvas: {
        width: 800,
        height: 700,
        backgroundColor: 'rgba(0, 0, 0)',
        lineWidthMin: 1,
        lineWidthMax: 15,
        lineWidthChangeSpeed: 0.05,
        lineWidthIntervalMin: 100,
        lineWidthIntervalMax: 300,
        circleGradientStops: [
            { offset: 0, color: '#ffffff' },
            { offset: 1, color: '#e0e0e0' }
        ],
        highVolumeGradientStops: [
            { offset: 0, color: '#FA0004' },
            { offset: 1, color: '#FA0004' }
        ]
    },
    text: {
        font: '16px Verdana',
        color: 'white',
        align: 'center',
        position: { x: 'center', y: 'bottom' },
        offsetY: 20
    },
    audio: {
        fftSize: 256,
        smoothing: 0.25,
        volumeThreshold: 0.65,
        dbThreshold: 0.4,
        radiusShrinkFactor: 1,
        radiusShrinkDuration: 200
    },
    controls: {
        initialVolume: 1,
        initialRadius: 1,
        initialRotationSpeed: 0.01
    },
    rotation: {
        minSharpTurnAngle: Math.PI / 4,
        maxSharpTurnAngle: Math.PI / 2,
        minSharpTurnInterval: 200,
        maxSharpTurnInterval: 500
    }
};
