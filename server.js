const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const cors = require('cors')
const Pusher = require('pusher')
const countryData = require('country-data')
const dialogflow = require('dialogflow')
const NewsAPI = require('newsapi')
const dlv = require('dlv')
require('dotenv').config()

const newsapi = new NewsAPI(process.env.NEWS_API_KEY)

const projectId = process.env.DIALOGFLOW_PROJECT_ID // update with your project Id
const sessionId = 'session120820191229' // use any string as session Id
const languageCode = 'en-US'

const config = {
    credentials: {
        private_key: process.env.DIALOGFLOW_PRIVATE_KEY,
        client_email: process.env.DIALOGFLOW_CLIENT_EMAIL,
    },
};

const sessionClient = new dialogflow.SessionsClient(config)
const sessionPath = sessionClient.sessionPath(projectId, sessionId)

const countryDataByName = countryData.countries.all.reduce((acc, curr) => {
    acc[curr.name.toLowerCase()] = curr
    return acc
}, {})

// build query for getting an Intent
const buildQuery = function (query) {
    return {
    session: sessionPath,
    queryInput: {
        text: {
        text: query,
        languageCode: languageCode
        }
    }
    }
}

// use data from intent to  fetch news
const fetchNews = function (intentData) {
    const category = dlv(intentData, 'category.stringValue')
    const geoCountry = dlv(intentData, 'geo-country.stringValue', '').toLowerCase()
    const country = dlv(countryDataByName, `${geoCountry}.alpha2`, 'us')

    return newsapi.v2.topHeadlines({
    category,
    language: 'en',
    country
    })
}

app.use(cors())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

const pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: process.env.PUSHER_CLUSTER,
    encrypted: true
})

// receive message sent by client
app.post('/message', function (req, res) {
    return sessionClient
    .detectIntent(buildQuery(req.body.message))
    .then(responses => {
    console.log('Detected intent')
    const result = dlv(responses[0], 'queryResult')
    const intentData = dlv(responses[0], 'queryResult.parameters.fields')

    // if there's a result and an intent
    if (result && result.intent) {
        fetchNews(intentData)
        .then(news => news.articles)
        .then(articles => pusher.trigger('news', 'news-update', articles.splice(0, 6)))
        .then(() => console.log('published to pusher'))
    } else {
        console.log(`  No intent matched.`)
    }
    return res.sendStatus(200)
    })
    .catch(err => {
    console.error('ERROR:', err)
    })
})

const port = process.env.PORT || 5000

app.listen(port, function () {
    console.log('Node app is running at localhost:' + port)
})