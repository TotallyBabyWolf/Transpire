const atlheteModel = require("../models/athleteModel");
const teamModel = require("../models/teamModel");

const script = require("./scripts");

const SECRET = process.env.SECRET

const createTeam = async (req,res) => {
    try {
        const authHeader = req.get("Authorization");
        const BlockAccess = script.TokenVerifier(authHeader, SECRET);
        if (BlockAccess) return res.status(401).send("Invalid header, please contact support");
        const { 
            name,
            sports,
            description,
            socials,
            adm,
            friendlyOrExclusive
        } = req.body;
        const findAthlete = await atlheteModel.findById(adm, ["teams"])
        if (!findAthlete) return res.status(404).send("No Athlete found to be the first administrator of the team");
        if (findAthlete.teams.length > 9) return res.status(403).json({ msg: "Cannot enter or create another team" });
        const newTeam = new teamModel({
            name,
            sports,
            description,
            socials,
            adm: adm,
            athletes: [adm],
            friendlyOrExclusive
        });
        const savedTeam = await newTeam.save();
        findAthlete.teams.push(savedTeam.id);
        await atlheteModel.findByIdAndUpdate(adm, {teams: findAthlete.teams});
        res.status(201).json({ msg: "New team created:", savedTeam });
    } catch(error) {
        res.status(500).json(error.message);
    };
};

const allTeams = async (req,res) => {
    try {
        const authHeader = req.get("Authorization");
        const BlockAccess = script.TokenVerifier(authHeader, SECRET);
        if (BlockAccess) return res.status(401).send("Invalid header, please contact support");
        const allTeamsList = await teamModel.find({}, ["name", "sports", "description"]);
        res.status(200).json(allTeamsList);
    } catch(error) {
        res.status(500).json(error.message);
    };
};

const updateTeam = async (req,res) => {
    try {
        const authHeader = req.get("Authorization");
        const BlockAccess = script.TokenVerifier(authHeader, SECRET);
        if (BlockAccess) return res.status(401).send("Invalid header, please contact support");
        const { id } = req.params;
        const { name, sports, description, socials, adm } = req.body
        const findTeam = await teamModel.findById(id, ["name","adm"]);
        if (!findTeam) return res.status(404).send("No team found with ID");
        let isAdm = false
        findTeam.adm.forEach(admin =>{
            if(admin.includes(adm)) isAdm = true
        })
        if (!isAdm) res.status(403).send(`Please contact an administrator from ${findTeam.name} to update the information`);
        await teamModel.findByIdAndUpdate(id, { name, sports, description, socials });
        res.status(200).send("Team updated successfully");
    } catch(error) {
        res.status(500).json(error.message);
    };
}; //TO BE TESTED

const addRemoveAdministrator = async (req,res) => {
    try {
        const authHeader = req.get("Authorization");
        const BlockAccess = script.TokenVerifier(authHeader, SECRET);
        if (BlockAccess) return res.status(401).send("Invalid header, please contact support");
        const { id } = req.params;
        const findTeam = await teamModel.findById(id, "adm");
        if(!findTeam) return res.status(404).send(`No team found with ID ${id}`);
        const { adm, add, remove } = req.body;
        if (!findTeam.adm.includes(adm)) return res.status(403).send("Please contact a team Administrator to add or remove administrators");
        if (add && !findTeam.adm.includes(add)){
            const findAthlete = atlheteModel.findById(id);
            if (!findAthlete) return res.status(404).send(`No athlete found with ID ${id}`);
            const addAdm = findTeam.adm.push(add);
            await teamModel.findByIdAndUpdate(id, {adm: addAdm});
            return res.status(200).send("New administrator added successfully");
        };
        if (remove && findTeam.adm.includes(remove) && findTeam.adm.length > 1){
            const removeIndex = findTeam.indexOf(remove);
            const removeAdm = findTeam.adm.splice(removeIndex, 1);
            await teamModel.findByIdAndUpdate(id, {adm: removeAdm});
            return res.status(200).send("Administrator removed successfully");
        };
        res.status(400).send("Could not add/remove administrator");

    } catch(error) {
        res.status(500).json(error.message);
    };
}; //TO BE TESTED

const findTeamById = async (req,res) => {
    try {
        const authHeader = req.get("Authorization");
        const BlockAccess = script.TokenVerifier(authHeader, SECRET);
        if (BlockAccess) return res.status(401).send("Invalid header, please contact support");
        const { id } = req.params;
        const findTeam = await teamModel.findById(id, ["id", "athletes", "name", "description", "sports", "friendlyOrExclusive"]);
        if(!findTeam) return res.status(404).send(`No team found with ID ${id}`);
        res.status(200).json({findTeam});
    } catch(error) {
        res.status(500).json(error.message);
    };
};

const findTeamByQuery = async (req,res) => {
    try {
        const authHeader = req.get("Authorization");
        const BlockAccess = script.TokenVerifier(authHeader, SECRET);
        if (BlockAccess) return res.status(401).send("Invalid header, please contact support");
        const { name, sports, trans } = req.body;
        if (name){
            const allTeams = teamModel.find();
            const findTeams = [];
            allTeams.forEach(team => {
                if (team.name.toLowerCase().includes(name.toLowerCase())) findTeams.push(team);
            });
            if (findTeams.length == 0) return res.status(404).send("No team found");
            res.status(200).send(findTeams);
        };
        if (sports){
            const findTeams = await teamModel.find({sports: sports}, ["name", "sports", "transFriendly_Exclusive"]);
            if(!findTeams) return res.status(404).send("No team found");
            res.status(200).send(findTeams);
        };
        if (trans){
            const findTeams = await teamModel.find({transFriendly_Exclusive: trans}, ["name", "sports", "transFriendly_Exclusive"]);
            if(!findTeams) return res.status(404).send("No team found");
            res.status(200).send(findTeams);
        };
        res.status(400).send("Please enter a name, sport or inclusiveness");
    } catch(error) {
        res.status(500).json(error.message);
    };
};

const removeAthleteFromTeam = async (req,res) => {
    try {
        const authHeader = req.get("Authorization");
        const BlockAccess = script.TokenVerifier(authHeader, SECRET);
        if (BlockAccess) return res.status(401).send("Invalid header, please contact support");
        const { id } = req.params;
        const findTeam = await teamModel.findTeamById(id);
        if(!findTeam) return res.status(404).send("No team found");
        const { adm, athlete } = req.body;
        if (!findTeam.adm.includes(adm)) return res.status(403).send(`Only administrator can remove athletes`);
        if (!findTeam.athletes.includes(athlete)) return res.status(404).send("Athlete not found in the team");
        const athleteIndex = findTeam.athletes.indexOf(athlete);
        findTeam.athletes.splice(athleteIndex, 1);
        await teamModel.findByIdAndUpdate(id, {athletes: findTeam.athletes});
    } catch(error) {
        res.status(500).json(error.message);
    };
}; //TO BE TESTED

const enter_LeaveTeam = async (req,res) => {
    try {
        const authHeader = req.get("Authorization");
        const BlockAccess = script.TokenVerifier(authHeader, SECRET);
        if (BlockAccess) return res.status(401).send("Invalid header, please contact support");
        const { id } = req.params;
        const findTeam = await teamModel.findById(id, "athletes");
        if(!findTeam) return res.status(404).send("No team found");
        const { athleteID } = req.body;
        if (!findTeam.athletes.includes(athleteID)){
            findTeam.athletes.push(athleteID);
        };
        if (findTeam.athletes.includes(athleteID)){
            const indexAthlete = findTeam.athletes.indexOf(athleteID);
            findTeam.athletes.splice(indexAthlete, 1);
        };
        await teamModel.findByIdAndUpdate(id, {athletes: findTeam.athletes});
        res.status(206);
        
    } catch(error) {
        res.status(500).json(error.message);
    };
}; //TO BE TESTED

const deleteTeam = async (req,res) => {
    try {
        const authHeader = req.get("Authorization");
        const BlockAccess = script.TokenVerifier(authHeader, SECRET);
        if (BlockAccess) return res.status(401).send("Invalid header, please contact support");
        const { id } = req.params;
        const findTeam = await teamModel.findById(id, ["adm","athletes", "name"]);
        if (!findTeam) return res.status(404).send("Team not found");
        const { adm } = req.body;
        if (!findTeam.adm.includes(adm)) return res.status(403).send("You need to be an administrator do delete the group");
        findTeam.athletes.forEach(async athleteID => {
            const athlete = await atlheteModel.findOne({id: athleteID}, ["teams"]);
            const teamIdIndex = athlete.teams.indexOf(id);
            athlete.teams.splice(teamIdIndex, 1);
            await atlheteModel.findByIdAndUpdate(athlete.id, {teams: athlete.teams});
        });
        await teamModel.findByIdAndDelete(id)
        res.status(200).json({ msg: `Team ${findTeam.name} deleted` })
    } catch(error) {
        res.status(500).json(error.message);
    };
};

const functionModel = async (req,res) => {
    try {
        const authHeader = req.get("Authorization");
        const BlockAccess = script.TokenVerifier(authHeader, SECRET);
        if (BlockAccess) return res.status(401).send("Invalid header, please contact support");
    } catch(error) {
        res.status(500).json(error.message);
    };
};

module.exports = {
    createTeam,
    allTeams,
    updateTeam,
    addRemoveAdministrator,
    findTeamById,
    findTeamByQuery,
    deleteTeam,
    removeAthleteFromTeam,
    enter_LeaveTeam
}