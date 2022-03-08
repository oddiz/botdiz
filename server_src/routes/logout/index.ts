import { getToken } from '@server_src/scripts/getToken'
import { Express } from 'express'
import { Db } from 'mongodb'

export default async function logout(app: Express, db: Db) {

    app.post('/logout', async (req, res) => {

        const reqToken = getToken(req)

        if(!reqToken) return res.status(401).send({ error: "No token provided" })

        try {
            const result = await db.collection('sessions').deleteOne({ "token": reqToken })

            if (result.deletedCount === 0) return res.status(401).send(
                { 
                    status: "failed",
                    message: "Invalid token" 
                })
            

            res.send({
                status: "success",
                message: "Logout successful"
            })
            
            return

        } catch (error) {
            res.status(404).send({
                status: "failed",
                message: "Invalid token"
           }) 
        }


    })

}