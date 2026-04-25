const express = require('express');
const axios = require('axios');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

async function queryOpenAI(prompt) {
    try {
        const response = await axios.post('https://api.openai.com/v1/completions', {
            model: 'text-davinci-003',
            prompt: prompt,
            max_tokens: 150
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data.choices[0].text.trim();
    } catch (error) {
        console.error('OpenAI error:', error);
        throw error;
    }
}

function queryLocalLLM(prompt) {
    return new Promise((resolve, reject) => {
        exec(`ollama run model --prompt '${prompt}'`, (err, stdout, stderr) => {
            if (err) {
                console.error('Local LLM error:', stderr);
                reject(err);
                return;
            }
            resolve(stdout.trim());
        });
    });
}

app.post('/query', async (req, res) => {
    const { prompt } = req.body;
    try {
        const result = await queryOpenAI(prompt);
        res.json({ result });
    } catch (error) {
        console.log('Falling back to local LLM');
        try {
            const result = await queryLocalLLM(prompt);
            res.json({ result });
        } catch (localError) {
            res.status(500).json({ error: 'Both OpenAI and local LLM failed' });
        }
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});