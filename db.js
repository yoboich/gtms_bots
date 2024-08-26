const mysql = require('mysql')
const config = require('./config')

function mysql_real_escape_string (str) {
    return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (char) {
        switch (char) {
            case "\0":
                return "\\0";
            case "\x08":
                return "\\b";
            case "\x09":
                return "\\t";
            case "\x1a":
                return "\\z";
            case "\n":
                return "\\n";
            case "\r":
                return "\\r";
            case "\"":
            case "'":
            case "\\":
            case "%":
                return "\\"+char; // prepends a backslash to backslash, percent,
                                  // and double/single quotes
            default:
                return char;
        }
    });
}

class DB {

    constructor() {
        this.con = mysql.createPool({
            connectionLimit: 100,
            host: config.db_host,
            user: config.db_user,
            password: config.db_password,
            database: config.db_name,
	    
        })
    }

    async getUsers() {
        return new Promise((resolve, reject) => {
            this.con.query(`SELECT * FROM users`, (err, rows) => {
                if (err) reject(err)
                resolve(rows)
            }) 
        })
    }

    async getUser(tgid) {
        return new Promise((resolve, reject) => {
            this.con.query(`SELECT * FROM users WHERE tgid=${tgid}`, (err, rows) => {
                if (err) reject(err)
                resolve(rows[0])
            }) 
        })
    }

    async getClanName(clan_id) {
        return new Promise((resolve, reject) => {
            this.con.query(`SELECT title FROM clans WHERE id=${clan_id}`, (err, rows) => {
                if (err) reject(err)
                resolve(rows[0])
            }) 
        })
    }

    async addUser(tgId, name, refferal, add_score, band, multiref) {
        this.con.query(`SELECT * FROM users WHERE tgid = ${tgId}`, (err, rows) => {
            if (err) throw err;
            if (rows.length < 1) {
                if (refferal === 0){
                    this.con.query(`INSERT INTO users VALUES (${tgId}, '${name}', "${band}", 0, 1, "", ${refferal}, 0, 1, ${false}, 0, 1, 1, '')`)
                } else {
                    let score = add_score
                    if (multiref) {
                        score = 1000000
                    }
                    this.con.query(`INSERT INTO users VALUES (${tgId}, '${name}', "${band}", ${score}, 1, "", ${refferal}, 0, 1, ${false}, 0, 1, 1, '')`)
                    this.con.query(`UPDATE users SET score = score + ${score}, ref_earned = ref_earned + ${score} WHERE tgid = ${refferal}`)
                }
            }
        })
    }

    async setUserClan(tgId, clan) {
        this.con.query(`UPDATE users set clan = '${clan}' WHERE tgid = ${tgId}`)
    }

    async setUserScore(tgId, score) {
        if (score > 0) {
            this.con.query(`UPDATE users set score = ${score} WHERE tgid = ${tgId}`)
        } else {
            console.log(score)
        }
    }

    async checkFClan(tgId) {
        this.con.query(`UPDATE users set f_clan = 1 WHERE tgid = ${tgId}`)
    }


    async getMRUser(url) {
        return new Promise((resolve, reject) => {
            this.con.query(`SELECT * FROM mr_users WHERE url='${url}'`, (err, rows) => {
                if (err) reject(err)
                    if (rows) {
                        resolve(rows[0])
                    } else {
                        resolve(undefined)
                    }
            }) 
        })
    }

    async addTask(platform, title, link, bonus) {
        this.con.query(`INSERT INTO tasks VALUES (0, '${platform}', '${title}', '${link}', ${bonus})`)
    }

    async getTasks() {
        return new Promise((resolve, reject) => {
            this.con.query(`SELECT * FROM tasks WHERE type <> 'chat' AND type <> 'wallet' AND type <> 'eday'`, (err, rows) => {
                if (err) reject(err)
                    
                resolve(rows)
            }) 
        })
    }

    async getTask(id) {
        return new Promise((resolve, reject) => {
            this.con.query(`SELECT * FROM tasks WHERE id=${id}`, (err, rows) => {
                if (err) reject(err)
                    
                resolve(rows[0])
            }) 
        })
    }

    async deleteTask(id) {
        this.con.query(`DELETE FROM tasks WHERE id=${id}`)
        this.con.query(`DELETE FROM task_check WHERE task_id=${id}`)
    }

}

const db = new DB()

module.exports = db
