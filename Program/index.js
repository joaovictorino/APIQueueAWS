const amqp = require('amqplib/callback_api')
const request = require('request')

const dotenv = require('dotenv');
dotenv.config();

const opt = { credentials: require('amqplib').credentials.plain('joao', 'Teste@admin123')  }

if (process.env.LOCAL){
    amqp.connect(process.env.QUEUE, connect);
}else{
    amqp.connect(process.env.QUEUE, opt, connect);
} 
    
function connect (err, conn) {
    process.once('SIGINT', function() { conn.close(); });

    conn.createChannel((err, ch) => {
        var queue = 'rpc_queue';

        if(process.env.PARTNER1){
            queue = 'rpc_queue_partner1';
        }

        ch.assertQueue(queue, {durable:false});
        ch.prefetch(1);

        console.log(`Listening`);

        ch.consume(queue, (msg) => {
            const body = JSON.parse(msg.content.toString());

            console.log(`Message received from API ${body.partner}`);

            // Se errar a rota ou algo der errado no get a mensagem fica na fila e o script encerra
            request.get('http://ipinfo.io/ip', (err, response, data) => {

                if(data){
                    console.log(`Sending response ${data}`);
                    ch.sendToQueue(msg.properties.replyTo, 
                        Buffer.from(`{ body: ${body.partner}, request: ${data}}`),
                        {correlationId: msg.properties.correlationId});
                    ch.ack(msg);
                }

                if(err){
                    ch.close();
                    ch = null;
                    conn.close();
                    conn = null;
                }
            });
        });
    });
}