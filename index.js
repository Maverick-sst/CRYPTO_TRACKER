const { DateTime } = luxon;

const PROXY = '';
const BASE_URL = 'https://api.coingecko.com/api/v3';

class CryptoDashboard {
    constructor() {
        this.priceChart = null;
        this.selectedCrypto = 'bitcoin';
        this.initializeUI();
        this.setupEventListeners();
        this.initializeChart();
        this.startUpdates();
    }

    initializeUI() {
        this.cryptoSelect = document.getElementById('crypto');
        this.priceDisplay = document.getElementById('price-display');
        this.predictionDisplay = document.getElementById('prediction-display');
        this.cryptoImage = document.getElementById('crypto-img');  // Added reference for the image
    }

    setupEventListeners() {
        this.cryptoSelect.addEventListener('change', (e) => {
            this.selectedCrypto = e.target.value;
            this.updateData();
        });
    }

    initializeChart() {
        const ctx = document.getElementById('crypto-chart').getContext('2d');
        this.priceChart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Price (USD)',
                    borderColor: '#000000',
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    fill: true,
                    data: []
                }]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day',
                            tooltipFormat: 'yyyy-MM-dd'
                        },
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Price (USD)'
                        },
                        ticks: {
                            callback: (value) => `$${value.toLocaleString()}`
                        }
                    }
                }
            }
        });
    }

    async fetchData(endpoint) {
        try {
            const response = await fetch(`${BASE_URL}${endpoint}`);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching data:', error);
            throw error;
        }
    }

    async updateData() {
        try {
            this.priceDisplay.textContent = 'Loading...';
            this.predictionDisplay.textContent = 'Loading prediction...';

            const [priceData, historicalData, imageData] = await Promise.all([
                this.fetchData(`/simple/price?ids=${this.selectedCrypto}&vs_currencies=usd`),
                this.fetchData(`/coins/${this.selectedCrypto}/market_chart?vs_currency=usd&days=365`),
                this.fetchData(`/coins/${this.selectedCrypto}`)
            ]);

            const currentPrice = priceData[this.selectedCrypto]?.usd;
            if (!currentPrice) throw new Error('Price data unavailable');
            this.priceDisplay.textContent = `$${currentPrice.toLocaleString()}`;

            const chartData = historicalData.prices.map(([timestamp, price]) => ({
                x: timestamp,
                y: price
            }));

            this.priceChart.data.datasets[0].data = chartData;
            this.priceChart.update();

            // Update the crypto image
            const imageUrl = imageData.image?.small;
            if (imageUrl) {
                this.cryptoImage.src = imageUrl;
                this.cryptoImage.alt = `${this.selectedCrypto} logo`;
            } else {
                this.cryptoImage.src = '';
                this.cryptoImage.alt = 'Image not available';
            }

            // Add Linear Regression prediction
            const prediction = this.calculateLinearRegressionPrediction(historicalData.prices);
            this.predictionDisplay.textContent = `Price Prediction for next 24hrs: $${prediction.toFixed(2)} (based on Linear Regression)`;

        } catch (error) {
            console.error('Error updating data:', error);
            this.priceDisplay.textContent = 'Error loading data';
            this.predictionDisplay.textContent = 'Error loading prediction';
        }
    }

    calculateLinearRegressionPrediction(prices) {
        // We'll use the last 30 days of data for prediction
        const data = prices.slice(-30);  // Last 30 days
        const x = data.map(([timestamp]) => DateTime.fromMillis(timestamp).toMillis());  // Dates in milliseconds
        const y = data.map(([_, price]) => price);  // Prices

        const n = x.length;
        const sumX = x.reduce((acc, val) => acc + val, 0);
        const sumY = y.reduce((acc, val) => acc + val, 0);
        const sumXY = x.reduce((acc, val, index) => acc + val * y[index], 0);
        const sumX2 = x.reduce((acc, val) => acc + val * val, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        // Predict the next price (based on linear trend)
        const nextTimestamp = DateTime.now().plus({ days: 1 }).toMillis();
        const predictedPrice = slope * nextTimestamp + intercept;

        return predictedPrice;
    }

    startUpdates() {
        this.updateData();
        setInterval(() => this.updateData(), 60000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new CryptoDashboard();
});
