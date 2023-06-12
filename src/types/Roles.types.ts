interface RoleType {
  role: string;
}

const userAbilities = [
  {
    role: "admin",
  },
  {
    role: "user",
  },
  {
    role: "guest",
  },
] satisfies RoleType[];

type Roles = (typeof userAbilities)[number]["role"];
// ^? type Roles = 'administrator' | 'user' | 'guest'

export default Roles;
