"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var uuid_1 = require("uuid");
var prisma = new client_1.PrismaClient();
var branchesToSeed = [
    {
        name: 'Mekelle Head Office',
        code: 'MEK-HO',
        location: 'Hawezien Adebaby, Mekelle, Tigray, Ethiopia',
        status: 'OPERATIONAL',
        phonePrimary: '0953 44 44 11',
        officeHours: 'Mon-Fri 8:00 AM - 5:00 PM, Sat 8:00 AM - 12:00 PM',
        mapUrl: 'https://www.google.com/maps?q=Mekelle,Ethiopia&output=embed',
        published: true,
    },
    {
        name: 'Adigrat',
        code: 'ADI-01',
        location: 'Main Road, Adigrat',
        status: 'OPERATIONAL',
        phonePrimary: '0997 34 62 00',
        officeHours: 'Mon-Fri 8:00 AM - 5:00 PM, Sat 8:00 AM - 12:00 PM',
        mapUrl: 'https://www.google.com/maps?q=Adigrat,Ethiopia&output=embed',
        published: true,
    },
    {
        name: 'Adwa',
        code: 'ADW-01',
        location: 'Central Square, Adwa',
        status: 'OPERATIONAL',
        phonePrimary: '0997 33 92 00',
        officeHours: 'Mon-Fri 8:00 AM - 5:00 PM, Sat 8:00 AM - 12:00 PM',
        mapUrl: 'https://www.google.com/maps?q=Adwa,Ethiopia&output=embed',
        published: true,
    },
    {
        name: 'Shire',
        code: 'SHI-01',
        location: 'Market District, Shire',
        status: 'OPERATIONAL',
        phonePrimary: '0997 34 32 00',
        officeHours: 'Mon-Fri 8:00 AM - 5:00 PM, Sat 8:00 AM - 12:00 PM',
        mapUrl: 'https://www.google.com/maps?q=Shire,Ethiopia&output=embed',
        published: true,
    },
    {
        name: 'Mekelle',
        code: 'MEK-01',
        location: 'Romanat Square, Mekelle',
        status: 'OPERATIONAL',
        phonePrimary: '0997 34 42 00',
        officeHours: 'Mon-Fri 8:00 AM - 5:00 PM, Sat 8:00 AM - 12:00 PM',
        mapUrl: 'https://www.google.com/maps?q=Mekelle,Ethiopia&output=embed',
        published: true,
    },
    {
        name: 'AbiAdi',
        code: 'ABI-01',
        location: 'City Center, AbiAdi',
        status: 'OPERATIONAL',
        phonePrimary: '0903 21 23 00',
        officeHours: 'Mon-Fri 8:00 AM - 5:00 PM, Sat 8:00 AM - 12:00 PM',
        mapUrl: 'https://www.google.com/maps?q=AbiAdi,Ethiopia&output=embed',
        published: true,
    },
    {
        name: 'Rama',
        code: 'RAM-01',
        location: 'Main Border Corridor, Rama',
        status: 'OPERATIONAL',
        phonePrimary: '0903 35 13 00',
        officeHours: 'Mon-Fri 8:00 AM - 5:00 PM, Sat 8:00 AM - 12:00 PM',
        mapUrl: 'https://www.google.com/maps?q=Rama,Ethiopia&output=embed',
        published: true,
    },
    {
        name: 'Maychew',
        code: 'MAY-01',
        location: 'Downtown, Maychew',
        status: 'OPERATIONAL',
        phonePrimary: '0903 04 73 00',
        officeHours: 'Mon-Fri 8:00 AM - 5:00 PM, Sat 8:00 AM - 12:00 PM',
        mapUrl: 'https://www.google.com/maps?q=Maychew,Ethiopia&output=embed',
        published: true,
    },
];
function seedBranches() {
    return __awaiter(this, void 0, void 0, function () {
        var _i, branchesToSeed_1, branch, existing;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('Starting to seed branches...');
                    _i = 0, branchesToSeed_1 = branchesToSeed;
                    _a.label = 1;
                case 1:
                    if (!(_i < branchesToSeed_1.length)) return [3 /*break*/, 6];
                    branch = branchesToSeed_1[_i];
                    return [4 /*yield*/, prisma.branch.findFirst({
                            where: { name: branch.name }
                        })];
                case 2:
                    existing = _a.sent();
                    if (!!existing) return [3 /*break*/, 4];
                    return [4 /*yield*/, prisma.branch.create({
                            data: __assign(__assign({ id: (0, uuid_1.v4)() }, branch), { 
                                // Make sure it matches Prisma schema Types
                                status: branch.status })
                        })];
                case 3:
                    _a.sent();
                    console.log("Created branch: ".concat(branch.name));
                    return [3 /*break*/, 5];
                case 4:
                    console.log("Branch already exists: ".concat(branch.name));
                    _a.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 1];
                case 6:
                    console.log('Seeding completed.');
                    return [2 /*return*/];
            }
        });
    });
}
seedBranches()
    .catch(function (e) {
    console.error(e);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
