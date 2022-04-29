import express, { json } from "express";
import cors from "cors";
import chalk from "chalk";
import dayjs from "dayjs";
import joi from "joi";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();
const mongoClient = new MongoClient(process.env.MONGO_URI);
// ...
const app = express();
app.use(cors());
app.use(json());

app.post("/participants", async (req, res) => {
    const participante = joi.object({
        name: joi.string() .required()
    })
    const validacao = participante.validate(req.body);

    if (validacao.error) {
        console.log(chalk.bold.red("nome não pode ser vazio"),validacao.error.details)
        res.status(422).send("Use o formato: { name: João}");
        return;
    }

    const { name } = req.body;

    try {
        await mongoClient.connect();
        const dbBatePapo = mongoClient.db("batepapo");
        const participantesCollection = dbBatePapo.collection("participantes");
        const temParticipante = await participantesCollection.findOne({ name: name });
        if (temParticipante) {
            console.log(chalk.bold.red("O usuario já existe"),temParticipante);
            res.status(409).send("Nome de usuário já cadastrado");
            return;
        } else {
            await participantesCollection.insertOne({ name: name, lastStatus: Date.now() })
            const mensagensCollection = dbBatePapo.collection("mensagens");
            await mensagensCollection.insertOne({
                from: name, 
                to: 'Todos',
                text: 'entra na sala...',
                type: 'status',
                time: dayjs().locale('pt-br').format('hh:mm:ss')
            })
            res.sendStatus(201);
            mongoClient.close();
        }
    } catch (e) {
        console.log(e);
        res.sendStatus(500);
        mongoClient.close();
    }
});

app.get("/participants", async (req, res) => {
    try {
		await mongoClient.connect();
        const dbBatePapo = mongoClient.db("batepapo");
		const participantesCollection = dbBatePapo.collection("participantes");
		const participantes = await participantesCollection.find({}).toArray();	
		res.send(participantes);
		mongoClient.close();
	 } catch (error) {
	    res.sendStatus(500);
		mongoClient.close()
	 }
});

app.post('/messages', async (req, res) => {
    const mensagem = { ...req.body, from: req.headers.user }
    const horario = dayjs().locale('pt-br').format('hh:mm:ss');

    const validaMensagem = joi.object({
        to: joi.string().required(),
        text: joi.string().required(),
        type: joi.string().valid('message', 'private_message').required(),
        from: joi.string().required()
    })

    const validacao = validaMensagem.validate(mensagem)

    if (validacao.error) {
        console.log(chalk.bold.red("Algum campo está errado"), validacao.error.details)
        res.sendStatus(422);
        return;
    }

    try {

    } catch (error) {

    }
})


app.listen(5000, console.log(chalk.bold.yellow("Servidor rodando na porta 5000")));