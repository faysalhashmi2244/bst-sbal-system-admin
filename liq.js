function getRandomNumber(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const initialUSD = 5000// initial usd
const initialTACOS = 31250000/2 // initial tacos

const initialPrice = initialUSD / initialTACOS // initial price
const transaction = 30000 //number of wallets, currently 1 transaction per wallet

//initial cost + commission 78000 + 3%, 78000/2 = 39k

console.log("initial price is", initialPrice)

let price = initialPrice
let USDTPool = initialUSD;
let TACOSPool = initialTACOS
let totalBuy = 0
let totalSell = 0

function buying(i) {
let buyAmount = getRandomNumber(10, 100) // buying between 100 between
    //sell small amount
    let totalTacos = buyAmount / price //price
    USDTPool = USDTPool + buyAmount //because we are buying so we will add in usdt pool
    TACOSPool = TACOSPool - totalTacos //we are getting tacos from the pool

    price = USDTPool / TACOSPool
    totalBuy = totalBuy + buyAmount
    
    console.log("Buying", i)
    console.log("buying amount", buyAmount)
    console.log("buying at price", price)
    console.log("usdt in pool", USDTPool)
    console.log("TACOS in pool", TACOSPool)

}

function selling(i) {
  let sellAmount = getRandomNumber(10, 100) // selling tacos between 100 between
    //sell small amount
    let totalUSDT = sellAmount * price //price
    USDTPool = USDTPool - totalUSDT //because we are buying so we will add in usdt pool
    TACOSPool = TACOSPool + sellAmount //we are getting tacos from the pool

    price = USDTPool / TACOSPool
    totalSell = totalSell + sellAmount
    
    console.log("Selling", i)
    console.log("buying amount", sellAmount)
    console.log("buying at price", price)
    console.log("usdt in pool", USDTPool)
    console.log("TACOS in pool", TACOSPool)

}

for(let i = 0; i < transaction; i++) {
    buying(i)
    // selling(i)
}

console.log("Initial Price was", initialPrice)
console.log("ending Price was", price)
console.log("Total buy", totalBuy, "USDT")
console.log("Total sell", totalSell, "TACOS")
