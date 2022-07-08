const express = require('express')
const bodyParser = require('body-parser')
const amqp = require('amqplib/callback_api')
const uuid = require('uuid')
const app = express()
app.use(bodyParser.json())
const port = 80
const opt = { credentials: require('amqplib').credentials.plain('joao', 'Teste@admin123')  }

app.post('/', (req, res) => {
    if (process.env.LOCAL){
        amqp.connect(process.env.QUEUE, connect);
    }else{
        amqp.connect(process.env.QUEUE, opt, connect);
    }   
        
    function connect (err, conn) {
        conn.createChannel((err, ch) =>{
            ch.assertQueue('', {exclusive:true}, (err, q) =>{
                const correlation = uuid.v1();

                console.log(`Sending message "${req.body.partner}" to queue`)

                var queue = 'rpc_queue';

                if(req.body.partner == 'partner1'){
                    queue = 'rpc_queue_partner1';
                } 

                ch.sendToQueue(queue, 
                            Buffer.from(`{ "partner" : "${req.body.partner}" }`),
                            {correlationId:correlation, replyTo: q.queue});

                ch.consume(q.queue, (msg) => {
                    console.log(`Received from queue ${msg.content}`);
                    if(msg.properties.correlationId == correlation){
                        res.send(msg.content.toString());
                    }
                }, {noAck: true});
            });
        });
    }
})

app.get('/', (req, res) =>{
    res.send('ok');
})

app.listen(port, () => {
    console.log(`listening port ${port}`)
})