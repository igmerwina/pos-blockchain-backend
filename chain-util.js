// berisi file untuk generate wallet key, unique hasesh etc

const crypto = require('crypto')
const SHA256 = require('crypto-js/sha256')

 
class ChainUtil{
    static genKeyPair(){
        const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
            namedCurve: 'secp256k1'
        })

        return {
            getPublic(){
                return {
                    encode(){
                        return publicKey.export({ type: 'spki', format: 'der' }).toString('hex')
                    }
                }
            },
            sign(dataHash){
                return crypto.sign('SHA256', Buffer.from(dataHash), privateKey).toString('hex')
            }
        }
    }

    static id(){
        return crypto.randomUUID()
    }

    static hash(data){
        return SHA256(JSON.stringify(data)).toString()
    }

    static verifySignature(publicKey, signature, dataHash){
        const key = crypto.createPublicKey({
            key: Buffer.from(publicKey, 'hex'),
            format: 'der',
            type: 'spki'
        })

        return crypto.verify('SHA256', Buffer.from(dataHash), key, Buffer.from(signature, 'hex'))
    }
}


module.exports = ChainUtil
