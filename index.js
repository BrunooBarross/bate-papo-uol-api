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
        name: joi.string()
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
            console.log(temParticipante);
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


app.listen(5000, console.log(chalk.bold.yellow("Servidor rodando na porta 5000")));