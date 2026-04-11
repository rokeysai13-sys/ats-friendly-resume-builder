/**
 * Lightweight Reactive Store
 */
class Store {
    constructor(initialState) {
        this.state = initialState;
        this.listeners = {};
    }

    // Subscribe to a specific store path or '*' for everything
    subscribe(path, callback) {
        if (!this.listeners[path]) {
            this.listeners[path] = [];
        }
        this.listeners[path].push(callback);
    }

    // Deep merge and emit changes
    update(path, value) {
        const keys = path.split('.');
        let current = this.state;
        
        // Traverse to set the deep value
        for (let i = 0; i < keys.length - 1; i++) {
            if (current[keys[i]] === undefined) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;

        this._emit(path, value);
        this._emit('*', this.state, path);
    }

    _emit(path, value, changedPath = null) {
        if (this.listeners[path] && Array.isArray(this.listeners[path])) {
            this.listeners[path].forEach(cb => cb(value, changedPath));
        }
    }
}

// Initial dummy state
const initialState = {
    template: "modern",
    personal: {
        fullName: "John Doe",
        email: "john.doe@email.com",
        phone: "+1 555-0100",
        location: "San Francisco, CA",
        linkedin: "linkedin.com/in/johndoe",
        portfolio: "johndoe.dev"
    },
    summary: "",
    education: [
        {
            school: "University of Technology",
            degree: "B.S. in Computer Science",
            startYear: "2014",
            endYear: "2018"
        }
    ],
    experience: [
        {
            id: 1,
            companyName: "Quantum Dynamics AI",
            role: "Senior Solutions Architect",
            location: "Remote",
            startDate: "2021-01",
            endDate: "", // Present
            description: "Architected a generative AI pipeline reducing content creation time by 65%. Led a cross-functional team of 12 engineers."
        }
    ],
    skills: ["React/Next.js", "Python (Django)", "AWS Infrastructure", "TypeScript"],
    skillsString: "React/Next.js, Python (Django), AWS Infrastructure, TypeScript",
    projects: [
        {
            title: "AI Resume Builder",
            techStack: "Flask, JavaScript, Tailwind",
            description: "Built a fully functional resume builder using Flask and Vanilla JS.",
            githubLink: "",
            demoLink: "",
            createdDate: ""
        }
    ],
    certifications: [
        {
            name: "AWS Certified Solutions Architect",
            issuingOrganization: "Amazon Web Services",
            issueDate: "",
            expirationDate: "",
            credentialUrl: ""
        }
    ]
};

export const store = new Store(initialState);
