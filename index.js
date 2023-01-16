const mongo = require("mongodb")
const args = require("yargs")

let argv = args
.command("*", "mongodb移行用")
.options({
    destination: {
        type: "string",
        describe: "移行先のdbのURL",
        demandOption: true,
        alias: "dest",
    },
    source: {
        type: "string",
        describe: "移行元のdbのURL",
        demandOption: true,
        alias: "src"
    }
})
.parseSync()

if (!argv.source.startsWith("mongodb://") && !argv.source.startsWith("mongodb+srv://")) {
    console.log("移行元URLの形式が間違っています")
    process.exit(1)
}

if (!argv.destination.startsWith("mongodb://") && !argv.destination.startsWith("mongodb+srv://")) {
    console.log("移行先URLの形式が間違っています")
    process.exit(1)
}

console.log(`${argv.source} ---> ${argv.destination}`)

const client1 = new mongo.MongoClient(argv.source)
const client2 = new mongo.MongoClient(argv.destination)

client1.connect().then(async () => {
    console.log("移行元DB: 接続しました")
    await client2.connect()
    console.log("移行先DB: 接続しました")
    let collections = await client1.db().collections()
    console.log(`移行元DB: ${client1.db().databaseName}`)
    console.log(`移行元DB: ${collections.length}コレクションが見つかりました`)
    let db2 = client2.db()
    collections.forEach(async (collection) => {
        console.log(`コレクション ${collection.collectionName} を作成中...`)
        await db2.dropCollection(collection.collectionName)
        db2.createCollection(collection.collectionName).then(async (coll2) => {
            (await client1.db().collection(collection.collectionName)).find({}).toArray().then(async (docs) => {
                if (docs.length == 0) return console.log(`${coll2.collectionName}: データがないためスキップします`)
                await coll2.insertMany(docs)
                console.log(`${coll2.collectionName}: 完了`)
            })
        })
    })
})