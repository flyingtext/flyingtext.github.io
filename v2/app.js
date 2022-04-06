const {
    colors,
    CssBaseline,
    ThemeProvider,
    Typography,
    Container,
    createTheme,
    Box,
    SvgIcon,
    Link,
    AppBar,
    Toolbar
} = MaterialUI;

const config = {
    locateFile: file => `https://sql.js.org/dist/${file}`
}


// Create a theme instance.
const theme = createTheme({
    palette: {
        primary: {
            main: '#556cd6',
        },
        secondary: {
            main: '#19857b',
        },
        error: {
            main: colors.red.A400,
        },
    },
});

function App() {
    const [db, setDB] = React.useState(null);
    const [herbs, setHerbs] = React.useState({});
    const [prescriptions, setPrescriptions] = React.useState({});

    const [recipe, setRecipe] = React.useState([]);


    if (!db) {
        initSqlJs(config).then(function (SQL) {
            fetch("/static/data_new.sqlite").then(res => res.arrayBuffer()).then((data) => {
                const db = new SQL.Database(new Uint8Array(data));
                setDB(db);
            });
        });
    }

    if ((Object.keys(herbs).length == 0) && db) {
        const stmt = db.prepare("SELECT DISTINCT 약재명, 약재명한글 FROM prescp;");
        let _herbs = {};
        while (stmt.step()) {
            const row = stmt.getAsObject();
            _herbs.push[row['약재명']] = row['약재명한글'];
        }
        setHerbs(_herbs);
    }

    if ((Object.keys(prescriptions).length == 0) && db) {
        const stmt = db.prepare("SELECT DISTINCT 처방명, 처방한글명, 출전출처 FROM prescp;");
        let _prescriptions = {};
        while (stmt.step()) {
            const row = stmt.getAsObject();
            _prescriptions[row['처방명'] + ' / ' + row['출전출처']] = row['처방한글명'].split('(')[0];
        }

        setPrescriptions(_prescriptions);
    }

    const handleChange = (recipeChanged) => {
        setRecipe(recipeChanged);
    };

    return (
        <div>
            <AppBar position="static">
                <Container maxWidth="xl">
                    <Toolbar disableGutters>
                        <Typography
                            variant="h6"
                            noWrap
                            component="div"
                            sx={{ mr: 2, display: { xs: 'none', md: 'flex' } }}
                        >
                            Korean Medicine Prescription Analysis
                        </Typography>

                        <ReactTagsInput value={recipe} onChange={handleChange} />
                    </Toolbar>
                </Container>
            </AppBar>
        </div>
    );
}

ReactDOM.render(
    <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
    </ThemeProvider>,
    document.querySelector('#root'),
);