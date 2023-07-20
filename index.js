//common js 구문 import ---> require("모듈")
//express

const express = require("express");
const cors = require("cors");
const multer = require("multer")
const mysql = require("mysql");
const bcrypt = require('bcrypt'); //암호화 API
const saltRounds = 10;

//서버 생성
const app = express();

//포트번호
const port = 8080;

//브라우져의 cors이슈를 막기 위해 설정
app.use(cors());

// json형식 데이터를 처리하도록 설정
app.use(express.json());
// upload폴더 클라이언트에서 접근 가능하도록 설정
app.use("/upload",express.static("upload"));
//storage생성
const storage = multer.diskStorage({
    destination: (req,file,cb)=>{
        cb(null,'upload/')
    },
    filename:(req,file,cb)=>{
        const newFilename = file.originalname
        cb(null,newFilename)
    }
})
//upload객체 생성하기
const upload = multer({ storage : storage });
//upload경로로 post 요청시 응답 구현하기
app.post("/upload",upload.single("file"),async (req,res)=>{
    res.send({
        imageURL:req.file.filename
    })
})

//mysql 연결 생성
const conn = mysql.createConnection({
    host:process.env.AWS_ACCESS_HOST,
    user:"admin",
    password:process.env.AWS_ACCESS_KEY,
    port:"3306",
    database:"TeamProject"
})
conn.connect();

// conn.query("쿼리문","콜백함수")

app.get('/place',(req,res)=>{
    conn.query("select * from City",(error,result,field)=>{
        if(error){
            res.send(error)
        }else{
            res.send(result)
        }
    })
})
//http://localhost:8080/special/1
//req{ params: {no:1}}
// 나라정보 받아오기
app.get("/place/:place",(req,res)=>{
    const {place} =req.params;
    conn.query(`select * from City where cityname = "${place}"`,(err,result,field)=>{
        if(err){
            res.send(err)
        }else{
            res.send(result)
        }
    })
})

//나라별 마커 포인트 받아오기
app.get("/marker/:place",(req,res)=>{
    const {place} =req.params;
    conn.query(`select * from SpotPlace where Nation = "${place}"`,(err,result,field)=>{
        if(err){
            res.send(err)
        }else{
            res.send(result)
        }
    })
})

//회원가입요청
app.post("/join",async (req,res)=>{
    //입력받은 비밀번호를 mytextpass로 저장
    const mytextpass = req.body.m_pass;
    let myPass = ""
    const {m_name,m_nickname,m_email} = req.body;

    // 빈문자열이 아니고 undefined가 아닐때
    if(mytextpass != '' && mytextpass != undefined){
        bcrypt.genSalt(saltRounds, function(err, salt) {
            //hash메소드 호출되면 인자로 넣어준 비밀번호를 암호화 하여 콜백함수 안 hash로 돌려준다
            bcrypt.hash(mytextpass, salt, function(err, hash) {// hash는 암호화시켜서 리턴되는값.
                // Store hash in your password DB.
                myPass = hash;
                conn.query(`insert into member(m_name,m_pass,m_email,m_nickname) 
                values( '${m_name}' , '${myPass}' , '${m_email}' , '${m_nickname}')`
                ,(err,result,fields)=>{
                    console.log(result);
                    res.send("등록되었습니다.")
                })
            
            });
        });
    }
    console.log(req.body)
})
//로그인 요청 하기 
app.post("/login",async(req,res)=> {
    // 1.) useremail 값에 일치하는 데이터가 있는지 확인한다.
    // 2.) userpass 암호화해서 쿼리 결과의 패스워드랑 일치하는지 체크
    //{"useremail":"ㅁㄴㅇ""userpass":"asd"}
    const {useremail,userpass }=req.body;
    conn.query(`select * from member where m_email = '${useremail}'`, (err,result,fields)=>{
        //결과가 undefined 가 아니고 결과의 0번째가 undefined가 아닐때= 결과가 있을때 
        if(result != undefined && result[0] !=undefined ){
            bcrypt.compare(userpass,result[0].m_pass, function(err,rese){
                //result == true
                if(result){
                    console.log("로그인 성공");
                    res.send(result);
                }else{
                    console.log("로그인 실패");
                    res.send(result);
                }
            })
        }else{
            console.log("데이터가 존재하지 않습니다.");
        }
    })
})

//비밀번호찾기 
app.post("/findPass", async (req,res) => {
    const {useremail} = req.body;
    console.log(req.body)
    conn.query(`select * from member where m_email = '${useremail}'`,(err,result,field)=>{
        if(result){
            console.log(`결과${result[0].useremail}`)
            res.send(result[0].m_email)
        }else{
            console.log(err)
        }
    })
})

//패스워드 변경 요청
app.patch("/updatePass",async (req, res)=>{
    console.log(req.body)
    const {m_pass,m_email} = req.body;
    //update 테이블이름 set 필드이름= 데이터값 where 조건
        const mytextpass = m_pass;
    let myPass = ""

    if(mytextpass != '' && mytextpass != undefined){
        bcrypt.genSalt(saltRounds, function(err, salt) {
            //hash메소드 호출되면 인자로 넣어준 비밀번호를 암호화 하여 콜백함수 안 hash로 돌려준다
            bcrypt.hash(mytextpass, salt, function(err, hash) {// hash는 암호화시켜서 리턴되는값.
                // Store hash in your password DB.
                myPass = hash;
                conn.query(`update member set m_pass='${myPass}' where m_email='${m_email}'`
                ,(err,result,fields)=>{
                    if(result){
                        res.send("등록되었습니다.")
                    }
                    console.log(err)
                })
            
            });
        });
    }
})

//추천 관광지 받아오기
app.get("/recommend/:place",(req,res)=>{
    const {place} =req.params;
    conn.query(`select * from SpotPlace where Nation = "${place}" and recommend IS NOT NULL order by recommend`,(err,result,field)=>{
        if(err){
            res.send(err)
            console.log(err)
        }else{
            res.send(result)
            console.log(result)
        }
    })
})

app.get("/citydesc/:place",(req,res)=>{ //axios.get('/citydesc/${places}')
    const {place} = req.params;
    conn.query(`select month_1,month_2,month_3,month_4,month_5,month_6,month_7,month_8,month_9,month_10,month_11,month_12 from City where cityname = '${place}'`,
    (err,result,fields)=>{
        if(result){
            res.send(result)
            console.log(result)
        }
        console.log(err)
    })
})





app.listen(port,()=>{
    console.log("서버가 구동중입니다.")
})
