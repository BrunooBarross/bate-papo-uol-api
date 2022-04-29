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
    const userFrom= req.headers.user;
    const horario = dayjs().locale('pt-br').format('hh:mm:ss');
    const mensagem = {from: userFrom, ...req.body, time: horario}

    const validaMensagem = joi.object({
        from: joi.string().required(),
        to: joi.string().required(),
        text: joi.string().required(),
        type: joi.string().valid('message', 'private_message').required(),
        time: joi.optional()
    })

    const validacao = validaMensagem.validate(mensagem);

    if (validacao.error) {
        console.log(chalk.bold.red("Erro Joi: Algum campo está errado"), validacao.error.details)
        res.sendStatus(422);
        return;
    }

    try {
        await mongoClient.connect();
        const dbBatePapo = mongoClient.db("batepapo");
        const participantesCollection = dbBatePapo.collection("participantes");
        const temParticipante = await participantesCollection.findOne({ name: userFrom });
        if (!temParticipante) {
            console.log(chalk.bold.red("O usuario não existe"));
            res.sendStatus(422);
            mongoClient.close();
            return;
        }
        const mensagensCollection = dbBatePapo.collection("mensagens");
        await mensagensCollection.insertOne(mensagem)
        res.sendStatus(201);
        mongoClient.close();

    } catch (error) {
        console.log(error)
        res.sendStatus(500);
		mongoClient.close()
    }
})

app.get('/messages', async (req,res)=>{
    const user = req.headers.user;
    const limit = parseInt(req.query.limit);
    
    try {
        await mongoClient.connect();
        const dbBatePapo = mongoClient.db("batepapo");
        const mensagensCollection = dbBatePapo.collection("mensagens");
        const mensagens = await mensagensCollection.find({$or: [{ from: user }, { to: "Todos" }, { to: user }] }).toArray();
        const limitarMensagens = [...mensagens].slice(-limit)
        res.send(limitarMensagens);
    } catch (error) {
        console.log(error)
        res.sendStatus(500);
		mongoClient.close()
    }
})

app.listen(5000, console.log(chalk.bold.yellow("Servidor rodando na porta 5000")));