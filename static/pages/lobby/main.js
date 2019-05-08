// #region socket.io
var socket = io(`/lobby`)

socket.roomMembers = []

socket.createRoom = function (roomName) {
    socket.emit('room_create', roomName)
}
socket.joinRoom = function (roomName) {
    socket.emit('room_join', roomName)
}
socket.leaveRoom = function () {
    socket.emit('room_leave')
}
socket.send = function (msg) {
    socket.emit('send', msg)
}
socket.setName = function (nickname) {
    socket.emit('setName', nickname)
}
socket.getRooms = function () {
    return new Promise(resolve => {
        socket.emit('getRooms', res => {
            resolve(res)
        })
    })
}
socket.getClients = function () {
    return new Promise(resolve => {
        socket.emit('getClients', res => {
            resolve(res)
        })
    })
}
socket.getMyRooms = function () {
    return new Promise(resolve => {
        socket.emit('get_my_rooms', res => {
            resolve(res)
        })
    })
}
socket.setReadyState = function (boolean) {
    socket.emit('setReadyState', boolean)
}
socket.kick = function (userID) {
    socket.emit('kick', userID)
}

//      #region socket events

// triggers when someone tries to connect using token that is alredy in use - client should be immediately redirected to main page
socket.on('error_token', () => {
    window.alert('You are already connected from this browser. If you want do connect another client try incognito mode or other browsers')
    window.location = '/'
})

// triggers when someone sends message to room
socket.on('chat', msg => {
    console.log(msg);
    updateChat(msg)
})

socket.on('startGame', () => {
    window.location = '/game'
})

// triggers when someone disconnects from room
socket.on('user_disconnected', async id => {
    console.log(`user ${id} has disconnected`)
    // >here< place for additional function that will notify the users

    // update room admin if someon leaves
    let rooms = await socket.getRooms()
    let currentRoom = rooms.find(room => room.clients.find(client => client.id == socket.id))
    $('#socket-admin-name').html(currentRoom.admin.name)
})

// triggers when someone connects to room
socket.on('user_connected', id => {
    console.log(`user ${id} has connected`)
    // >here< place for additional function that will notify the users
})

// triggers when someone in room changes username (optional)
socket.on('username_change', id => {
    console.log(`user ${id} chnaged nickname`)
    // >here< place for additional function that will update list of room members
})

// triggers when someone joins / leaves / creates a room - conveinient to update room list or sth
socket.on('rooms_updated', () => {
    updateRoomMembers()
})

// triggers when user in room changes his ready state
socket.on('readyState_change', async () => {
    let rooms = await socket.getRooms()
    let room = rooms.find(room => room.clients.find(client => client.id == socket.id))
    let readyList = room.clients.map(client => `${client.name}: ${client.ready ? 'ready' : 'not ready'}`)
    console.log('list of ready cients')
    console.log(readyList)
    updateRoomMembers()

    if (room.admin.id == socket.id) {
        let everyone = true
        for (let client of room.clients) { // checking if everyone is ready
            if (!client.ready && room.admin.id != client.id) {
                everyone = false
            }
        }
        if (everyone)
            $('#button-start').removeAttr('disabled')
        else
            $('#button-start').attr('disabled', true)
    }
})

// triggers when user is being kicked
socket.on('get_kicked', () => {
    window.alert('You have been removed from this room by administrator') // for some reason this alert doesn't work in chrome incognito mode
    socket.leaveRoom()
    window.location = '/'
})

//      #endregion socket events

// #endregion socket.io

// #region Global Values
const memberColors = [
    '#DD3333',
    '#DD8833',
    '#DDDD33',
    '#3333DD',
    '#333333',
    '#DD33DD',
    '#33DDDD',
    '#33DD33'
]
// #endregion

$(document).ready(async () => {
    // block of code that cheks if user succesfully joined a room
    // if not (for example he refreshed page or room is full) he should be redirected to main page
    let myRooms = await socket.getMyRooms()
    if (Object.values(myRooms).length < 2) {
        window.location = '/'
    }

    // actually get room name from server room list, to prevent displaying client id instead of roomname
    let rooms = await socket.getRooms()
    let currentRoom = rooms.find(room => room.clients.find(client => client.id == socket.id))

    $('#socket-room-name').html(currentRoom.name) // display room name in #roomName div

    $('#socket-admin-name').html(currentRoom.admin.name) // fix admin display placeholder
    $('#socket-client-count').html(currentRoom.clients.length + '/' + currentRoom.size) // fix admin display placeholder


    updateRoomMembers() // trigger function displaying members of room manually
    UpdateBottomPanel()

    InitClicks() // Initializes bottom panel

    // send message on "enter" in chat
    $('#socket-chat-input').on('keyup', e => {
        if (e.keyCode === 13) {
            // Moved retired button function
            if ($('#socket-chat-input').val() !== '') { // Blocking empty messages
                let msg = {
                    author: socket.id, // id of current connection - will always be unique
                    content: $('#socket-chat-input').val()
                }
                socket.send(msg) // trigger event 'chat' for every user in room (including self) and pass msg obj as data
                $('#socket-chat-input').val('') // Clear message field to prevent accidental spam
            }
        }
    })

    // focus chat input on click
    $('#region-chat').click(() => document.getElementById('socket-chat-input').focus())
})



/* =================================== *
 *  Bottom panel functions start here  *
 * =================================== */

function InitClicks() {
    $('#button-back').click(() => {
        DisplayMainMenu()
    })

    $('#button-info').click(() => {
        DisplayRoomInfo()
    })

    $('#button-ready').click(async () => {

    })

    $('#button-start').click(async () => {
        let rooms = await socket.getRooms()
        let room = rooms.find(room => room.clients.find(client => client.id == socket.id))

        if (room.admin.id == socket.id) { // Checking if client is admin
            if (room.size != room.clients.length) { // prevent start if room not full
                window.alert('Room is not full')
                return
            }

            socket.setReadyState(true) // Host is ready when he presses this button (their ready-state wont be displayed anyways)

            socket.emit('start_game')
        } else {
            let client = room.clients.find(client => client.id == socket.id)
            socket.setReadyState(!client.ready)
            $('#button-start').html(`${!client.ready ? 'Ready' : 'Not ready'}`)
        }
    })
}

// #region Dialog Functions
function DisplayMainMenu() {
    let overlay = $('#overlay')
    let popup = $('#dialog').html('')

    if (overlay.css('display') == 'none')
        overlay.removeAttr('style')
    $(window).off('keydown')

    $(window).on('keydown', e => {
        let bTarget = $('#bExit')
        if (e.originalEvent.code == 'Enter' && !bTarget.prop('disabled')) {
            bTarget.trigger('click')
        }
    })

    popup.dialog({
        closeOnEscape: false,
        modal: true,
        draggable: false,
        resizable: false,
        dialogClass: 'no-close ui-dialog-confirm',
        width: 500,
        height: 150,
        title: 'Exit to Main Menu?',
        buttons: [
            {
                id: 'bExit',
                text: 'Yes',
                'class': 'ui-dialog-button',
                click: function () {
                    socket.leaveRoom() // prevent autoreconnect attempts
                    window.location = '/'
                }
            },
            {
                text: 'No',
                'class': 'ui-dialog-button',
                click: function () {
                    $(this).dialog('close')
                    overlay.css('display', 'none')
                }
            }
        ]
    })
}

function DisplayRoomInfo() {
    UpdateRoomInfo()

    let overlay = $('#overlay')
    let popup = $('#room-info').removeAttr('style')

    if (overlay.css('display') == 'none')
        overlay.removeAttr('style')
    $(window).off('keydown')

    popup.dialog({
        closeOnEscape: false,
        modal: true,
        draggable: false,
        resizable: false,
        dialogClass: 'no-close ui-dialog-confirm',
        width: 600,
        height: 350,
        title: 'Room Info',
        buttons: [
            {
                id: 'bClose',
                text: 'Close',
                'class': 'ui-dialog-button',
                click: function () {
                    $(this).dialog('close')
                    popup.css('display', 'none')
                    overlay.css('display', 'none')
                }
            }
        ]
    })
}
// #endregion

// #region Misc Functions
async function UpdateRoomInfo() {
    let rooms = await socket.getRooms()
    let room = rooms.find(room => room.clients.find(client => client.id == socket.id))

    $('#socket-room-name').html(room.name)
    $('#socket-admin-name').html(room.admin.name)
    $('#socket-client-count').html(room.clients.length + '/' + room.size)
}

async function UpdateBottomPanel() {
    let rooms = await socket.getRooms()
    let room = rooms.find(room => room.clients.find(client => client.id == socket.id))

    if (room.admin.id == socket.id) {
        $('#button-start').html('Start Game')

        let everyone = true
        for (let client of room.clients) { // checking if everyone is ready
            if (!client.ready && room.admin.id != client.id) { // except for yourself
                everyone = false
            }
        }
        if (everyone)
            $('#button-start').removeAttr('disabled')
        else
            $('#button-start').attr('disabled', true)
    } else {
        let client = room.clients.find(client => client.id == socket.id)
        $('#button-start').html(`${client.ready ? 'Ready' : 'Not ready'}`)
    }
}

async function updateRoomMembers() { // placeholder function triggered by 'rooms_updated' event
    let rooms = await socket.getRooms()
    let room = rooms.find(room => room.clients.find(client => client.id == socket.id))

    $('#socket-players').html('')

    let display = $('<div>')
    socket.roomMembers = room.clients
    for (let i in room.clients) {
        display.append(new RoomMember(i, room.clients[i].name, room.clients[i].ready))
    }
    if (display.html() == '') display.html() = '[]'
    $('#socket-players').append(display)

    UpdateBottomPanel()
}

async function updateChat(msg) { // placeholder function triggered by 'chat' event
    let author = socket.roomMembers.find(client => client.id == msg.author)

    let chat = $('#socket-chat-display').html()
    chat += `<div style="display: inline; color: #FF0000; text-shadow: 2px 0px 1px #000000;">${author.name}</div>: ${msg.content} <br>`
    $('#socket-chat-display').html(chat)

    $("#socket-chat-display").scrollTop($("#socket-chat-display")[0].scrollHeight) // scroll chat to bottom
}
// #endregion

// #region Classes
class RoomMember {
    constructor(id, name, readyState) {
        let cont = $('<div>')
            .addClass('room-member')

        let nameTag = $('<div>')
            .addClass('room-member-name')
            .html(name)
            .css('color', memberColors[id])
        cont.append(nameTag)

        if (id != 0) {
            let ready = $('<div>')
                .addClass('room-member-ready')
                .html(readyState ? 'Ready' : 'Not ready')
                .css('color', readyState ? '#33DD33' : '#DD3333')
            cont.append(ready)

            let kickButton = $('<button>')
                .addClass('room-member-kick')
                .html('Kick')
                .click(() => {
                    window.alert('KICK-PLACEHOLDER')
                })
            cont.append(kickButton)
        } else {
            let ready = $('<div>')
                .addClass('room-member-ready')
                .html('Host')
                .css('color', '#DDDD33')
            cont.append(ready)

            let kickButton = $('<button>')
                .addClass('room-member-kick')
                .html('Kick')
                .attr('disabled', true)
            cont.append(kickButton)
        }

        return cont
    }
}
// #endregion