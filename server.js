const express = require('express');
const cors = require('cors');
const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

let latestWebhookData = null;
let allWebhookData = [];

app.post('/webhook', (req, res) => {
    // Handle JSON payload from Go sender
    const receivedData = req.body;
    console.log('Received webhook data:', receivedData);
    
    const webhookData = {
        ID: receivedData.id || Date.now().toString(),
        Time: receivedData.time || new Date(),
        ChiSquare: receivedData.chi_square || 0,
        RealImpedance: receivedData.real_impedance || [],
        ImaginaryImpedance: receivedData.imaginary_impedance || [],
        Frequencies: receivedData.frequencies || [],
        Parameters: receivedData.parameters || [],
        ElementNames: receivedData.element_names || [],
        ElementImpedances: receivedData.element_impedances || [],
        CircuitType: receivedData.circuit_type || 'Unknown'
    };
    
    console.log('webhookData :=', JSON.stringify(webhookData, null, 2));
    
    latestWebhookData = webhookData;
    allWebhookData.push(webhookData);
    
    res.status(200).json({ 
        status: 'received', 
        id: webhookData.ID,
        impedancePoints: webhookData.RealImpedance.length
    });
});

app.get('/latest-webhook', (req, res) => {
    res.json(latestWebhookData || { message: 'No webhook data received yet' });
});

app.get('/all-webhooks', (req, res) => {
    res.json(allWebhookData);
});

app.listen(port, () => {
    console.log(`Webhook server running at http://localhost:${port}`);
    console.log(`Send webhooks to: http://localhost:${port}/webhook`);
});