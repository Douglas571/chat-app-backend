const { v4: generateID } = require('uuid')

const Koa = require('koa')
const Router = require('@koa/router')
const { koaBody } = require('koa-body');

const jwt = require('jsonwebtoken')

const app = new Koa()
const router = new Router()
const serve = require('koa-static')

const functions = {
    home: async ctx => {
        console.log('you are in home n.n')
        ctx.body = 'Hello World'
    },

    returnIP: async ctx => {
        let ip = ctx.request.ip
        console.log('here is your ip: ', ip)
        ctx.body = `Your IP is: ${ip}`
    },
}

app.use(serve(__dirname + '/static'))

router.get('/', functions.home)
router.get('/ip', functions.returnIP)


// TO-DO: Add jwt authentication
// write a simple json data base
const USERS = [
    { id: generateID(), username: 'douglas571', password: '123456789' },
]

const SECRET_KEY = 'a-super-secret-key'

function checkUser(data) {
    console.log({data})
    let user = USERS.find( u => u.username == data.username )

    if (!user) { 
        const err = new Error('user not found');
        err.status = 400;
        err.expose = true;
        throw err;

    } else if (user.password !== data.password) {
        const err = new Error('incorrect password');
        err.status = 400;
        err.expose = true;
        throw err;
    }

    console.log('the user is good')

    return true
}

const auth = {
    authenticate_user: async ctx => {

        const data = ctx.request.body

        checkUser(data)

        let token = jwt.sign(user, SECRET_KEY)

        ctx.body = { token }
    }
}

router.post('/auth', auth.authenticate_user)

function security (ctx, next) {
    const { authorization } = ctx.request.header

    if (!authorization) { 
        console.log('they not have token')
        ctx.throw(403, 'not authenticated') 
    }

    let token = authorization?.replace("Bearer ", '')
    console.log(`the token is: ${token}`)

    let data = jwt.verify(token, SECRET_KEY)
    

    checkUser(data)

    next()
}

router.get('/forbiden', security, (ctx) => {
    ctx.body = "the information here is forbiden!"
})

// create a midleware to check authentication data

// add a endpoint to send user and password

app.use(koaBody())

app.use(router.routes())
    .use(router.allowedMethods())


//app.listen(3000);
//console.log('server running on: http://localhost:3000')

const server = require('http').Server(app.callback())
const io = require('socket.io')(server)

io.of('/chat').on('connection', socket => {
    console.log(socket.auth)
    console.log('this is the chat namespace')
    const ID = socket.id
    
    socket.data.id = generateID()
    console.log(`A user was connected, id: ${socket.data.id}`)

    // init user
    function updateInfo() {
        io.to(ID).emit('update:info', socket.data)
    }

    updateInfo()

    // client events 

    socket.on('update:nickname', data => {
        socket.data.nickname = data?.nickname
        updateInfo()
    })

    function makeMsg(user, msg) {
        return `${user.nickname}: ${msg}`
    }

    socket.on('chat-message', msg => {
        console.log('message: ' + msg)
        io.except(ID).emit('chat-message', makeMsg(socket.data, msg));
    })

    socket.on('disconnect', () => {
        console.log('user disconnected :(')
    })
})

server.listen(4000, () => {
    console.log('server running on: http://localhost:4000')
})