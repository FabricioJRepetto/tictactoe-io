import React, { useState, useEffect } from 'react'
import { Routes, Route, useNavigate } from "react-router-dom";
import io from 'socket.io-client'
import { BACK_URL } from './constants'
import UsernameInput from './components/UsernameInput'
// import Contacts from './components/contacts/Contacts'
// import ChatContainer from './components/ChatContainer'
import DMChat from './components/dmChat/DMChat'
import TicTacToe from './components/tictactoe/TicTacToe';
import { useCon } from './context'

import './App.css'
import RageAgainstTheMachine from './components/tictactoe/RageAgainstTheMachine';
// se conecta al socket
const socket = io(BACK_URL)

function App() {
    const [roomIdInput, setRoomIdInput] = useState('')
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()
    const { dispatch,
        state: {
            users,
            inboxes,
            chats,
            myId,
            logged
        }
    } = useCon()

    const handleNewConnection = (c) => {
        dispatch({ type: 'usersUpdate', payload: c.usersOnline })
        dispatch({ type: 'setId', payload: c.id })
        setLoading(false)
    }

    const handleConnectionsUpdate = (u) => {
        dispatch({ type: 'usersUpdate', payload: u.usersOnline })
    }

    const handleSendPrivate = (data) => {
        socket.emit('privateMessage', {
            message: data.message,
            to: data.to
        })
    }

    // const handleOpenInbox = ({ id, name }) => {
    //     try {
    //         let aux = inboxes
    //         if (!aux.has(id)) aux.set(id, { name, messages: [] })
    //         dispatch({ type: 'newInbox', payload: aux })

    //         let newDmChat = chats || {}
    //         newDmChat[id] = {
    //             name,
    //             open: true,
    //             expanded: true,
    //             typing: false,
    //             unseen: false
    //         }

    //         dispatch({ type: 'chatUpdate', payload: newDmChat })
    //     } catch (err) {
    //         console.log(err);
    //     }
    // }

    // Al ser una callback e intentar acceder al estado mediante el hook useState
    // obtengo el valor por defecto (sin importar que se haya actualizado antes)
    //? https://stackoverflow.com/questions/57847594/react-hooks-accessing-up-to-date-state-from-within-a-callback       
    const handleNewInbox = (m) => {
        try {
            // si el destinatario soy yo, abro el chat
            // y agrego el chat al context
            console.log(myId);
            if (m.to.id === myId) {
                let newDmChat = chats
                if (chats[m.from.id]) {
                    newDmChat[m.from.id] = {
                        ...chats[m.from.id],
                        open: true,
                        unseen: true
                    }
                } else {
                    newDmChat[m.from.id] = {
                        name: m.from.name,
                        open: true,
                        expanded: false,
                        unseen: true,
                        typing: false
                    }
                }

                dispatch({ type: 'chatUpdate', payload: newDmChat })
            }

            let aux = inboxes
            // si soy el emisor...
            if (m.from.id === myId) {
                aux.get(m.to.id).messages.push(m)
            } else { // si soy el receptor...
                if (aux.has(m.from.id)) {
                    aux.get(m.from.id).messages.push(m)
                } else {
                    aux.set(m.from.id, { messages: [m], name: m.from.name })
                }
            }

            dispatch({ type: 'newInbox', payload: aux })
        } catch (err) {
            console.log(err);
        }
    }

    const handleDMTyping = ({ id, typing }) => {
        try {
            if (chats[id]) {
                let newDmChat = chats
                newDmChat[id] = {
                    ...chats[id],
                    typing
                }
                dispatch({ type: 'chatUpdate', payload: newDmChat })
            }
        } catch (err) {
            console.log(err);
        }
    }

    useEffect(() => {
        socket.on('newConnection', (c) => handleNewConnection(c))
        socket.on('connectionsUpdate', (u) => handleConnectionsUpdate(u))
        socket.on('DMisTyping', (data) => handleDMTyping(data))
        socket.on('DMStopTyping', (data) => handleDMTyping(data))
        socket.on('privateMessage', (d) => handleNewInbox(d))
        socket.on('room', (d) => console.log(d))

        return () => {
            socket.off('connectionsUpdate')
            socket.off('newConnection')
            socket.off('privateMessage')
            socket.off('DMisTyping')
            socket.off('DMStopTyping')
            socket.off('room')
        }
        // dependencias deben estar vacías según documentación de socket.io
        // eslint-disable-next-line
    }, [])

    const newTTTRoom = () => {
        let roomid = Date.now().toString()
        navigate(`/game/${roomid}`)
    }

    const joinRoom = () => {
        if (roomIdInput.length === 13) {
            navigate(`/game/${roomIdInput}`)
        } else {
            alert('Invalid ID')
        }
    }

    return (
        <div className="App">
            <h1>TicTacToe Beta v1.1</h1>

            <Routes>
                <Route path="/" element={
                    <div>{
                        loading
                            ? <h2>connecting to server</h2>
                            : <>
                                {!logged
                                    ? <>
                                        <p>Users online: {users.length || 0}</p>
                                        <UsernameInput socket={socket} />
                                    </>
                                    : <div className='container'>
                                        {/* <Contacts handleOpenInbox={handleOpenInbox} />
                                    <ChatContainer socket={socket} handleOpenInbox={handleOpenInbox} /> 
                                    <button onClick={() => navigate('/')}>home</button>
                                    */}
                                        <p>Play against an evil machine</p>
                                        <button onClick={() => navigate('/ia')}>START</button>
                                        <p>...or play against a friend</p>
                                        <button onClick={newTTTRoom}>Create New Room</button>
                                        <button onClick={joinRoom}>Join Room</button>
                                        <input type="text"
                                            placeholder='Room ID'
                                            value={roomIdInput}
                                            onChange={(e) => setRoomIdInput(e.target.value)} />
                                    </div>}

                                {(chats) &&
                                    Object.entries(chats).map(([k, v]) => (
                                        v.open &&
                                        <DMChat key={k + myId}
                                            user={{ id: k, name: v.name }}
                                            socket={socket}
                                            handleSendPrivate={handleSendPrivate}
                                        />
                                    ))
                                }
                            </>
                    }</div>
                } ></Route>
                <Route path='/ia' element={<RageAgainstTheMachine />}></Route>
                <Route path='/game/:id' element={<TicTacToe socket={socket} />}></Route>
            </Routes>


        </div>
    )
}

export default App
